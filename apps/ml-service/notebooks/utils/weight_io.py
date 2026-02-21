"""Save and load trained model weights as .npz files."""

from pathlib import Path

import numpy as np

WEIGHTS_DIR = Path(__file__).parent.parent / "weights"

# Expected weight shapes for validation
VAE_WEIGHT_SHAPES = {
    "encoder_mu_w": (12, 32),
    "encoder_mu_b": (32,),
    "encoder_logvar_w": (12, 32),
    "encoder_logvar_b": (32,),
    "decoder_w": (32, 12),
    "decoder_b": (12,),
    "feature_means": (12,),
    "feature_stds": (12,),
}

RNN_WEIGHT_SHAPES = {
    "Wz": (39, 64),
    "Uz": (64, 64),
    "bz": (64,),
    "Wr": (39, 64),
    "Ur": (64, 64),
    "br": (64,),
    "Wh": (39, 64),
    "Uh": (64, 64),
    "bh": (64,),
    "Wo": (64, 32),
    "bo": (32,),
}


def save_vae_weights(weights: dict[str, np.ndarray], path: str | None = None) -> Path:
    """Save VAE weights to .npz file after validation."""
    save_path = Path(path) if path else WEIGHTS_DIR / "vae_weights.npz"
    _validate_weights(weights, VAE_WEIGHT_SHAPES, "VAE")
    save_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(save_path, **weights)
    print(f"VAE weights saved to {save_path}")
    return save_path


def load_vae_weights(path: str | None = None) -> dict[str, np.ndarray]:
    """Load VAE weights from .npz file."""
    load_path = Path(path) if path else WEIGHTS_DIR / "vae_weights.npz"
    if not load_path.exists():
        raise FileNotFoundError(f"VAE weights not found at {load_path}")
    data = dict(np.load(load_path))
    _validate_weights(data, VAE_WEIGHT_SHAPES, "VAE")
    return data


def save_rnn_weights(weights: dict[str, np.ndarray], path: str | None = None) -> Path:
    """Save RNN weights to .npz file after validation."""
    save_path = Path(path) if path else WEIGHTS_DIR / "rnn_weights.npz"
    _validate_weights(weights, RNN_WEIGHT_SHAPES, "RNN")
    save_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(save_path, **weights)
    print(f"RNN weights saved to {save_path}")
    return save_path


def load_rnn_weights(path: str | None = None) -> dict[str, np.ndarray]:
    """Load RNN weights from .npz file."""
    load_path = Path(path) if path else WEIGHTS_DIR / "rnn_weights.npz"
    if not load_path.exists():
        raise FileNotFoundError(f"RNN weights not found at {load_path}")
    data = dict(np.load(load_path))
    _validate_weights(data, RNN_WEIGHT_SHAPES, "RNN")
    return data


def _validate_weights(
    weights: dict[str, np.ndarray],
    expected_shapes: dict[str, tuple],
    model_name: str,
) -> None:
    """Validate that all expected weights are present with correct shapes."""
    for key, expected_shape in expected_shapes.items():
        if key not in weights:
            raise KeyError(f"{model_name} weight '{key}' missing from weights dict")
        actual_shape = weights[key].shape
        if actual_shape != expected_shape:
            raise ValueError(
                f"{model_name} weight '{key}' has shape {actual_shape}, "
                f"expected {expected_shape}"
            )
