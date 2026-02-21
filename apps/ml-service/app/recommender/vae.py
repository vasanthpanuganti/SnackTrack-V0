"""Variational Autoencoder (VAE) for recipe representation learning.

VAEs learn a compact latent representation of recipes and user preferences
in a continuous space. This enables:
- Smooth interpolation between recipe styles
- Generation of novel preference profiles
- Better handling of sparse interaction data
- Capturing non-linear relationships between ingredients and nutrition
"""

import os

import numpy as np
from psycopg import AsyncConnection

from ..config import settings


class RecipeVAE:
    """
    Variational Autoencoder for recipe embeddings.

    Architecture:
    - Encoder: Recipe features → μ (mean) + σ (std) of latent distribution
    - Latent space: 32-dimensional continuous representation
    - Decoder: Latent vector → reconstructed recipe features

    The VAE is pretrained on the recipe corpus and used to:
    1. Generate recipe embeddings for similarity search
    2. Map user preferences to the same latent space
    3. Enable exploration of the recipe space via interpolation
    """

    LATENT_DIM = 32
    FEATURE_DIM = 12  # calories, protein, carbs, fat, sodium, fiber, sugar, prep_time, servings, + 3 diet flags

    _DEFAULT_WEIGHTS_PATH = os.path.join(
        os.path.dirname(__file__), "..", "..", "notebooks", "weights", "vae_weights.npz"
    )

    def __init__(self):
        weights_path = settings.VAE_WEIGHTS_PATH or self._DEFAULT_WEIGHTS_PATH
        if weights_path and os.path.exists(weights_path):
            self._load_trained_weights(weights_path)
        else:
            self._init_random_weights()

    def _load_trained_weights(self, path: str) -> None:
        """Load weights exported from training notebook."""
        data = np.load(path)
        self.encoder_mu_w = data["encoder_mu_w"]          # (12, 32)
        self.encoder_mu_b = data["encoder_mu_b"]          # (32,)
        self.encoder_logvar_w = data["encoder_logvar_w"]  # (12, 32)
        self.encoder_logvar_b = data["encoder_logvar_b"]  # (32,)
        self.decoder_w = data["decoder_w"]                # (32, 12)
        self.decoder_b = data["decoder_b"]                # (12,)
        self.feature_means = data["feature_means"]        # (12,)
        self.feature_stds = data["feature_stds"]          # (12,)

    def _init_random_weights(self) -> None:
        """Fallback to random initialization when no trained weights are available."""
        rng = np.random.default_rng(42)
        self.encoder_mu_w = rng.standard_normal((self.FEATURE_DIM, self.LATENT_DIM)) * 0.1
        self.encoder_mu_b = np.zeros(self.LATENT_DIM)
        self.encoder_logvar_w = rng.standard_normal((self.FEATURE_DIM, self.LATENT_DIM)) * 0.1
        self.encoder_logvar_b = np.zeros(self.LATENT_DIM)
        self.decoder_w = rng.standard_normal((self.LATENT_DIM, self.FEATURE_DIM)) * 0.1
        self.decoder_b = np.zeros(self.FEATURE_DIM)
        self.feature_means = np.zeros(self.FEATURE_DIM)
        self.feature_stds = np.ones(self.FEATURE_DIM)

    def encode(self, features: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Encode recipe features to latent distribution parameters."""
        normalized = (features - self.feature_means) / (self.feature_stds + 1e-8)
        mu = normalized @ self.encoder_mu_w + self.encoder_mu_b
        logvar = normalized @ self.encoder_logvar_w + self.encoder_logvar_b
        return mu, logvar

    def reparameterize(self, mu: np.ndarray, logvar: np.ndarray) -> np.ndarray:
        """Sample from latent distribution using reparameterization trick."""
        std = np.exp(0.5 * logvar)
        eps = np.random.standard_normal(mu.shape)
        return mu + eps * std

    def decode(self, z: np.ndarray) -> np.ndarray:
        """Decode latent vector back to recipe feature space."""
        return z @ self.decoder_w + self.decoder_b

    def get_embedding(self, features: np.ndarray) -> np.ndarray:
        """Get deterministic embedding (using mean of distribution)."""
        mu, _ = self.encode(features)
        return mu

    def extract_features(self, recipe: dict) -> np.ndarray:
        """Extract feature vector from recipe dict."""
        features = np.array([
            recipe.get("calories") or 0,
            recipe.get("protein_g") or 0,
            recipe.get("carbs_g") or 0,
            recipe.get("fat_g") or 0,
            recipe.get("sodium_mg") or 0,
            recipe.get("fiber_g") or 0,
            recipe.get("sugar_g") or 0,
            recipe.get("ready_in_minutes") or 30,
            recipe.get("servings") or 4,
            1.0 if "vegetarian" in (recipe.get("diet_labels") or []) else 0.0,
            1.0 if "vegan" in (recipe.get("diet_labels") or []) else 0.0,
            1.0 if "gluten free" in (recipe.get("diet_labels") or []) else 0.0,
        ], dtype=np.float64)
        return features

    def fit_normalization(self, recipes: list[dict]) -> None:
        """Fit normalization statistics from recipe corpus."""
        if not recipes:
            return
        features = np.array([self.extract_features(r) for r in recipes])
        self.feature_means = features.mean(axis=0)
        self.feature_stds = features.std(axis=0)
        self.feature_stds[self.feature_stds == 0] = 1.0


# Singleton VAE instance
_vae = RecipeVAE()


async def get_vae_recommendations(
    conn: AsyncConnection,
    user_id: str,
    top_n: int = 10,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """
    Get recommendations using VAE latent space similarity.

    Maps the user's interacted recipes into latent space, computes
    an average user embedding, and finds closest recipes in that space.
    """
    # Get user's positively-interacted recipes
    result = await conn.execute(
        """
        SELECT r.id AS recipe_id, r.title, r.calories, r.protein_g, r.carbs_g,
               r.fat_g, r.sodium_mg, r.fiber_g, r.sugar_g,
               r.ready_in_minutes, r.servings, r.diet_labels
        FROM user_interactions ui
        JOIN recipes r ON r.id = ui.recipe_id
        WHERE ui.user_id = %s AND ui.interaction_value > 0
        ORDER BY ui.created_at DESC
        LIMIT 50
        """,
        (user_id,),
    )
    user_recipes = await result.fetchall()

    if not user_recipes:
        return []

    # Fit normalization on available recipes
    _vae.fit_normalization(user_recipes)

    # Compute user embedding as average of interacted recipe embeddings
    embeddings = []
    for recipe in user_recipes:
        features = _vae.extract_features(recipe)
        embedding = _vae.get_embedding(features)
        embeddings.append(embedding)

    user_embedding = np.mean(embeddings, axis=0)

    # Get candidate recipes
    exclude_clause = ""
    params: list = [top_n * 3]
    if exclude_ids:
        exclude_clause = "WHERE r.id != ALL(%s)"
        params.insert(0, exclude_ids)

    result = await conn.execute(
        f"""
        SELECT id AS recipe_id, title, calories, protein_g, carbs_g,
               fat_g, sodium_mg, fiber_g, sugar_g,
               ready_in_minutes, servings, diet_labels
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

    # Fit normalization on all candidates too
    _vae.fit_normalization(candidates + user_recipes)

    # Score candidates by latent space proximity
    scored = []
    for recipe in candidates:
        features = _vae.extract_features(recipe)
        embedding = _vae.get_embedding(features)

        # Cosine similarity in latent space
        dot = np.dot(user_embedding, embedding)
        norm_u = np.linalg.norm(user_embedding)
        norm_r = np.linalg.norm(embedding)
        similarity = dot / (norm_u * norm_r + 1e-8)

        scored.append({
            "recipe_id": recipe["recipe_id"],
            "title": recipe["title"],
            "score": float(similarity),
            "source": "vae",
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]
