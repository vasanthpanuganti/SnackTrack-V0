"""Recurrent Neural Network (RNN) for sequential meal pattern learning.

RNNs capture temporal patterns in user eating behavior:
- Time-of-day meal preferences (breakfast vs dinner choices)
- Weekly meal rotation patterns
- Seasonal food preferences
- Progressive dietary changes over time

The RNN processes the user's meal history as a sequence and predicts
the next likely preferred recipes.
"""

import os

import numpy as np
from psycopg import AsyncConnection

from ..config import settings


class MealSequenceRNN:
    """
    GRU-based RNN for learning meal sequence patterns.

    Architecture:
    - Input: Recipe embedding (32D) + time features (7D: day_of_week + hour + meal_type)
    - Hidden: GRU cell with 64-dimensional hidden state
    - Output: Next meal preference vector (32D recipe embedding space)

    Uses a simplified GRU implementation for production. In a full
    system, this would load trained PyTorch weights.
    """

    INPUT_DIM = 39  # 32 (recipe embedding) + 7 (time features)
    HIDDEN_DIM = 64
    OUTPUT_DIM = 32

    _DEFAULT_WEIGHTS_PATH = os.path.join(
        os.path.dirname(__file__), "..", "..", "notebooks", "weights", "rnn_weights.npz"
    )

    def __init__(self):
        weights_path = settings.RNN_WEIGHTS_PATH or self._DEFAULT_WEIGHTS_PATH
        if weights_path and os.path.exists(weights_path):
            self._load_trained_weights(weights_path)
        else:
            self._init_random_weights()

    def _load_trained_weights(self, path: str) -> None:
        """Load weights exported from training notebook."""
        data = np.load(path)
        self.Wz = data["Wz"]  # (39, 64)
        self.Uz = data["Uz"]  # (64, 64)
        self.bz = data["bz"]  # (64,)
        self.Wr = data["Wr"]  # (39, 64)
        self.Ur = data["Ur"]  # (64, 64)
        self.br = data["br"]  # (64,)
        self.Wh = data["Wh"]  # (39, 64)
        self.Uh = data["Uh"]  # (64, 64)
        self.bh = data["bh"]  # (64,)
        self.Wo = data["Wo"]  # (64, 32)
        self.bo = data["bo"]  # (32,)

    def _init_random_weights(self) -> None:
        """Fallback to random initialization when no trained weights are available."""
        rng = np.random.default_rng(42)
        # Update gate
        self.Wz = rng.standard_normal((self.INPUT_DIM, self.HIDDEN_DIM)) * 0.1
        self.Uz = rng.standard_normal((self.HIDDEN_DIM, self.HIDDEN_DIM)) * 0.1
        self.bz = np.zeros(self.HIDDEN_DIM)
        # Reset gate
        self.Wr = rng.standard_normal((self.INPUT_DIM, self.HIDDEN_DIM)) * 0.1
        self.Ur = rng.standard_normal((self.HIDDEN_DIM, self.HIDDEN_DIM)) * 0.1
        self.br = np.zeros(self.HIDDEN_DIM)
        # Candidate hidden state
        self.Wh = rng.standard_normal((self.INPUT_DIM, self.HIDDEN_DIM)) * 0.1
        self.Uh = rng.standard_normal((self.HIDDEN_DIM, self.HIDDEN_DIM)) * 0.1
        self.bh = np.zeros(self.HIDDEN_DIM)
        # Output projection
        self.Wo = rng.standard_normal((self.HIDDEN_DIM, self.OUTPUT_DIM)) * 0.1
        self.bo = np.zeros(self.OUTPUT_DIM)

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))

    def gru_step(
        self, x: np.ndarray, h_prev: np.ndarray
    ) -> np.ndarray:
        """Single GRU step."""
        z = self._sigmoid(x @ self.Wz + h_prev @ self.Uz + self.bz)
        r = self._sigmoid(x @ self.Wr + h_prev @ self.Ur + self.br)
        h_candidate = np.tanh(x @ self.Wh + (r * h_prev) @ self.Uh + self.bh)
        h_new = (1 - z) * h_prev + z * h_candidate
        return h_new

    def forward(self, sequence: list[np.ndarray]) -> np.ndarray:
        """Process a sequence of meal events and predict next preference."""
        h = np.zeros(self.HIDDEN_DIM)

        for x in sequence:
            h = self.gru_step(x, h)

        # Project to output space
        output = h @ self.Wo + self.bo
        return output

    @staticmethod
    def encode_time_features(
        day_of_week: int,
        hour: int,
        meal_type: str,
    ) -> np.ndarray:
        """Encode time-related features."""
        # Day of week (one-hot style: sin/cos encoding for cyclical nature)
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)

        # Hour (sin/cos encoding)
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)

        # Meal type encoding
        meal_types = {"breakfast": 0, "lunch": 1, "dinner": 2, "snack": 3}
        meal_idx = meal_types.get(meal_type, 1)
        meal_sin = np.sin(2 * np.pi * meal_idx / 4)
        meal_cos = np.cos(2 * np.pi * meal_idx / 4)

        return np.array([day_sin, day_cos, hour_sin, hour_cos, meal_sin, meal_cos,
                         float(meal_idx) / 3.0])


# Singleton RNN instance
_rnn = MealSequenceRNN()


async def get_rnn_recommendations(
    conn: AsyncConnection,
    user_id: str,
    top_n: int = 10,
    exclude_ids: list[str] | None = None,
    meal_type: str = "lunch",
) -> list[dict]:
    """
    Get recommendations based on the user's meal sequence patterns.

    Processes recent meal history through the RNN to predict
    next meal preferences, then finds closest matching recipes.
    """
    # Get user's recent meal history with timestamps
    result = await conn.execute(
        """
        SELECT ml.recipe_id, ml.meal_type, ml.logged_at,
               r.calories, r.protein_g, r.carbs_g, r.fat_g,
               r.sodium_mg, r.fiber_g, r.sugar_g,
               r.ready_in_minutes, r.servings, r.diet_labels,
               r.ingredient_vector
        FROM meal_logs ml
        LEFT JOIN recipes r ON r.id = ml.recipe_id
        WHERE ml.user_id = %s
        ORDER BY ml.logged_at DESC
        LIMIT 30
        """,
        (user_id,),
    )
    history = await result.fetchall()

    if len(history) < 3:
        return []  # Need minimum history for sequence modeling

    # Build input sequence (reversed to chronological order)
    sequence = []
    for meal in reversed(history):
        # Use recipe's ingredient_vector as embedding, or create from features
        if meal.get("ingredient_vector") is not None:
            recipe_emb = np.array(meal["ingredient_vector"])[:32]
            # Pad if needed
            if len(recipe_emb) < 32:
                recipe_emb = np.pad(recipe_emb, (0, 32 - len(recipe_emb)))
        else:
            # Create a simple feature-based embedding
            recipe_emb = np.zeros(32)
            recipe_emb[0] = (meal.get("calories") or 0) / 1000.0
            recipe_emb[1] = (meal.get("protein_g") or 0) / 100.0
            recipe_emb[2] = (meal.get("carbs_g") or 0) / 200.0
            recipe_emb[3] = (meal.get("fat_g") or 0) / 100.0

        # Extract time features
        logged_at = meal["logged_at"]
        time_features = _rnn.encode_time_features(
            day_of_week=logged_at.weekday() if hasattr(logged_at, "weekday") else 0,
            hour=logged_at.hour if hasattr(logged_at, "hour") else 12,
            meal_type=meal.get("meal_type") or "lunch",
        )

        # Concatenate recipe embedding + time features
        x = np.concatenate([recipe_emb, time_features])
        sequence.append(x)

    # Get prediction for next meal
    predicted_embedding = _rnn.forward(sequence)

    # Find closest recipes to the predicted embedding
    exclude_clause = ""
    params: list = [top_n * 3]
    if exclude_ids:
        exclude_clause = "WHERE r.id != ALL(%s)"
        params.insert(0, exclude_ids)

    result = await conn.execute(
        f"""
        SELECT id AS recipe_id, title, ingredient_vector,
               calories, protein_g, carbs_g, fat_g
        FROM recipes r
        {exclude_clause}
        ORDER BY cached_at DESC
        LIMIT %s
        """,
        tuple(params),
    )
    candidates = await result.fetchall()

    if not candidates:
        return []

    # Score by cosine similarity to predicted embedding
    scored = []
    pred_norm = np.linalg.norm(predicted_embedding)

    for recipe in candidates:
        if recipe.get("ingredient_vector") is not None:
            recipe_emb = np.array(recipe["ingredient_vector"])[:32]
            if len(recipe_emb) < 32:
                recipe_emb = np.pad(recipe_emb, (0, 32 - len(recipe_emb)))
        else:
            recipe_emb = np.zeros(32)
            recipe_emb[0] = (recipe.get("calories") or 0) / 1000.0
            recipe_emb[1] = (recipe.get("protein_g") or 0) / 100.0
            recipe_emb[2] = (recipe.get("carbs_g") or 0) / 200.0
            recipe_emb[3] = (recipe.get("fat_g") or 0) / 100.0

        recipe_norm = np.linalg.norm(recipe_emb)
        if pred_norm > 0 and recipe_norm > 0:
            similarity = float(np.dot(predicted_embedding, recipe_emb) / (pred_norm * recipe_norm))
        else:
            similarity = 0.0

        scored.append({
            "recipe_id": recipe["recipe_id"],
            "title": recipe["title"],
            "score": similarity,
            "source": "rnn",
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]
