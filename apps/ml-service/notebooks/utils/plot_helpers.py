"""Shared plotting utilities for consistent notebook styling."""

import numpy as np

SNACKTRACK_COLORS = {
    "primary": "#4CAF50",
    "secondary": "#FF9800",
    "accent": "#2196F3",
    "danger": "#F44336",
    "neutral": "#9E9E9E",
    "bg": "#FAFAFA",
}

PALETTE = ["#4CAF50", "#FF9800", "#2196F3", "#F44336", "#9C27B0", "#00BCD4",
           "#795548", "#607D8B", "#E91E63", "#CDDC39"]


def setup_plot_style():
    """Configure matplotlib/seaborn for consistent notebook styling."""
    import matplotlib.pyplot as plt
    import seaborn as sns

    sns.set_theme(style="whitegrid", palette=PALETTE)
    plt.rcParams.update({
        "figure.figsize": (12, 6),
        "figure.dpi": 100,
        "axes.titlesize": 14,
        "axes.labelsize": 12,
        "font.size": 11,
        "legend.fontsize": 10,
        "axes.facecolor": SNACKTRACK_COLORS["bg"],
    })


def plot_loss_curves(train_losses, val_losses, title="Training Progress"):
    """Plot training and validation loss curves."""
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(train_losses, label="Train Loss", color=SNACKTRACK_COLORS["primary"], linewidth=2)
    ax.plot(val_losses, label="Val Loss", color=SNACKTRACK_COLORS["secondary"], linewidth=2)
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.set_title(title)
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    return fig


def plot_latent_space_2d(embeddings, labels=None, title="Latent Space (t-SNE)"):
    """Plot 2D projection of latent space embeddings."""
    import matplotlib.pyplot as plt
    from sklearn.manifold import TSNE

    if embeddings.shape[1] > 2:
        tsne = TSNE(n_components=2, random_state=42, perplexity=min(30, len(embeddings) - 1))
        coords = tsne.fit_transform(embeddings)
    else:
        coords = embeddings

    fig, ax = plt.subplots(figsize=(10, 8))
    if labels is not None:
        unique_labels = sorted(set(labels))
        for i, label in enumerate(unique_labels):
            mask = np.array(labels) == label
            ax.scatter(coords[mask, 0], coords[mask, 1], label=label,
                       color=PALETTE[i % len(PALETTE)], alpha=0.6, s=20)
        ax.legend(bbox_to_anchor=(1.05, 1), loc="upper left")
    else:
        ax.scatter(coords[:, 0], coords[:, 1], alpha=0.5, s=20,
                   color=SNACKTRACK_COLORS["primary"])

    ax.set_title(title)
    ax.set_xlabel("Dimension 1")
    ax.set_ylabel("Dimension 2")
    plt.tight_layout()
    return fig


def plot_feature_distributions(features, feature_names, title="Feature Distributions"):
    """Plot histograms of feature distributions."""
    import matplotlib.pyplot as plt

    n_features = len(feature_names)
    n_cols = 4
    n_rows = (n_features + n_cols - 1) // n_cols

    fig, axes = plt.subplots(n_rows, n_cols, figsize=(16, 3 * n_rows))
    axes = axes.flatten()

    for i, (name, ax) in enumerate(zip(feature_names, axes)):
        ax.hist(features[:, i], bins=50, color=PALETTE[i % len(PALETTE)], alpha=0.7)
        ax.set_title(name, fontsize=10)
        ax.set_ylabel("Count")

    # Hide empty subplots
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)

    fig.suptitle(title, fontsize=14, y=1.02)
    plt.tight_layout()
    return fig
