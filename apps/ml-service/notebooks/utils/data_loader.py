"""Reusable data loading functions for Kaggle datasets and database tables."""

from pathlib import Path

import numpy as np
import pandas as pd
import psycopg

DATA_DIR = Path(__file__).parent.parent / "data"


# ---------------------------------------------------------------------------
# Database loaders
# ---------------------------------------------------------------------------


def load_recipes_from_db(conn: psycopg.Connection) -> pd.DataFrame:
    """Load all recipes from the database."""
    cur = conn.execute(
        """
        SELECT id, title, calories, protein_g, carbs_g, fat_g,
               sodium_mg, fiber_g, sugar_g, ready_in_minutes, servings,
               diet_labels, allergens, cuisine_types,
               ingredient_vector, nutrition_vector
        FROM recipes
        """
    )
    rows = cur.fetchall()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def load_interactions_from_db(conn: psycopg.Connection) -> pd.DataFrame:
    """Load all user interactions from the database."""
    cur = conn.execute(
        """
        SELECT user_id, recipe_id, interaction_type,
               interaction_value, created_at
        FROM user_interactions
        ORDER BY created_at
        """
    )
    rows = cur.fetchall()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def load_meal_logs_from_db(conn: psycopg.Connection) -> pd.DataFrame:
    """Load all meal logs from the database."""
    cur = conn.execute(
        """
        SELECT user_id, recipe_id, meal_type, food_name,
               calories, protein_g, carbs_g, fat_g, logged_at
        FROM meal_logs
        ORDER BY logged_at
        """
    )
    rows = cur.fetchall()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def load_user_profiles_from_db(conn: psycopg.Connection) -> pd.DataFrame:
    """Load user taste profiles from the database."""
    cur = conn.execute(
        """
        SELECT user_id, preference_vector, interaction_count,
               cold_start, content_weight, collab_weight, last_trained_at
        FROM user_taste_profiles
        """
    )
    rows = cur.fetchall()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def load_dietary_preferences_from_db(conn: psycopg.Connection) -> pd.DataFrame:
    """Load dietary preferences from the database."""
    cur = conn.execute(
        """
        SELECT user_id, diet_type, calorie_target, protein_target_g,
               carb_target_g, fat_target_g, cuisine_preferences
        FROM dietary_preferences
        """
    )
    rows = cur.fetchall()
    return pd.DataFrame(rows) if rows else pd.DataFrame()


# ---------------------------------------------------------------------------
# Kaggle dataset loaders (from parquet/CSV in data/)
# ---------------------------------------------------------------------------


def load_kaggle_dataset(name: str) -> pd.DataFrame:
    """Load a processed Kaggle dataset from the data/ directory.

    Tries parquet first (faster), falls back to CSV.
    """
    parquet_path = DATA_DIR / f"{name}.parquet"
    csv_path = DATA_DIR / f"{name}.csv"

    if parquet_path.exists():
        return pd.read_parquet(parquet_path)
    elif csv_path.exists():
        return pd.read_csv(csv_path)
    else:
        raise FileNotFoundError(
            f"Dataset '{name}' not found in {DATA_DIR}. "
            "Run notebook 00 to download datasets first."
        )


# ---------------------------------------------------------------------------
# Feature extraction (matches production inference code)
# ---------------------------------------------------------------------------


def extract_vae_features(recipes_df: pd.DataFrame) -> np.ndarray:
    """Extract 12D feature vectors for VAE training.

    Matches RecipeVAE.extract_features() in app/recommender/vae.py exactly.
    """
    features = np.column_stack([
        recipes_df.get("calories", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("protein_g", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("carbs_g", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("fat_g", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("sodium_mg", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("fiber_g", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("sugar_g", pd.Series(0, index=recipes_df.index)).fillna(0).values,
        recipes_df.get("ready_in_minutes", pd.Series(30, index=recipes_df.index)).fillna(30).values,
        recipes_df.get("servings", pd.Series(4, index=recipes_df.index)).fillna(4).values,
        _diet_flag(recipes_df, "vegetarian"),
        _diet_flag(recipes_df, "vegan"),
        _diet_flag(recipes_df, "gluten free"),
    ])
    return features.astype(np.float64)


def _diet_flag(df: pd.DataFrame, label: str) -> np.ndarray:
    """Extract a boolean diet flag from diet_labels column."""
    if "diet_labels" not in df.columns:
        return np.zeros(len(df))
    return df["diet_labels"].apply(
        lambda x: 1.0 if isinstance(x, list) and label in x else 0.0
    ).values


def build_rnn_sequences(
    meal_logs_df: pd.DataFrame,
    recipes_df: pd.DataFrame,
    seq_len: int = 20,
) -> tuple[np.ndarray, np.ndarray]:
    """Build RNN training sequences from meal logs.

    Returns (sequences, targets) where:
    - sequences: (N, seq_len, 39) input arrays
    - targets: (N, 32) next-meal recipe embeddings
    """
    from ..utils.data_loader import _encode_time_features

    sequences = []
    targets = []

    # Group by user, sort by time
    for _user_id, user_logs in meal_logs_df.groupby("user_id"):
        user_logs = user_logs.sort_values("logged_at")
        if len(user_logs) < seq_len + 1:
            continue

        # Build feature vectors for each meal
        meal_vectors = []
        for _, log in user_logs.iterrows():
            recipe_emb = _get_recipe_embedding(log, recipes_df)
            time_feat = _encode_time_features(log["logged_at"], log.get("meal_type", "lunch"))
            meal_vectors.append(np.concatenate([recipe_emb, time_feat]))

        # Sliding window
        for i in range(len(meal_vectors) - seq_len):
            seq = np.array(meal_vectors[i : i + seq_len])
            # Target is the recipe embedding of the next meal
            target_log = user_logs.iloc[i + seq_len]
            target_emb = _get_recipe_embedding(target_log, recipes_df)
            sequences.append(seq)
            targets.append(target_emb)

    if not sequences:
        return np.array([]).reshape(0, seq_len, 39), np.array([]).reshape(0, 32)

    return np.array(sequences), np.array(targets)


def _get_recipe_embedding(log: pd.Series, recipes_df: pd.DataFrame) -> np.ndarray:
    """Get 32D recipe embedding for a meal log entry."""
    emb = np.zeros(32)
    if "recipe_id" in log and log["recipe_id"] is not None and not recipes_df.empty:
        match = recipes_df[recipes_df["id"] == log["recipe_id"]]
        if not match.empty and match.iloc[0].get("ingredient_vector") is not None:
            vec = np.array(match.iloc[0]["ingredient_vector"])[:32]
            if len(vec) < 32:
                vec = np.pad(vec, (0, 32 - len(vec)))
            return vec
    # Fallback: feature-based proxy
    emb[0] = (log.get("calories") or 0) / 1000.0
    emb[1] = (log.get("protein_g") or 0) / 100.0
    emb[2] = (log.get("carbs_g") or 0) / 200.0
    emb[3] = (log.get("fat_g") or 0) / 100.0
    return emb


def _encode_time_features(logged_at, meal_type: str) -> np.ndarray:
    """Encode time features (7D) matching MealSequenceRNN.encode_time_features()."""
    day_of_week = logged_at.weekday() if hasattr(logged_at, "weekday") else 0
    hour = logged_at.hour if hasattr(logged_at, "hour") else 12

    day_sin = np.sin(2 * np.pi * day_of_week / 7)
    day_cos = np.cos(2 * np.pi * day_of_week / 7)
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)

    meal_types = {"breakfast": 0, "lunch": 1, "dinner": 2, "snack": 3}
    meal_idx = meal_types.get(meal_type, 1)
    meal_sin = np.sin(2 * np.pi * meal_idx / 4)
    meal_cos = np.cos(2 * np.pi * meal_idx / 4)

    return np.array([day_sin, day_cos, hour_sin, hour_cos, meal_sin, meal_cos,
                     float(meal_idx) / 3.0])
