"""
Shared configuration loading utility.

Resolves config.yaml using __file__-relative path computation so the
application works regardless of the current working directory.
"""

import os
import yaml

# Compute project root: the directory containing config.yaml
# __file__ is backend/config_loader.py, so two dirname() calls reach the project root.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CONFIG_PATH = os.path.join(_PROJECT_ROOT, 'config.yaml')


def get_config_path():
    """Return the absolute path to config.yaml."""
    return _CONFIG_PATH


def get_project_root():
    """Return the absolute path to the project root directory."""
    return _PROJECT_ROOT


def load_config():
    """Load and return the configuration dictionary from config.yaml.

    Returns:
        dict: The parsed YAML configuration.

    Raises:
        FileNotFoundError: If config.yaml does not exist at the expected path.
    """
    if not os.path.exists(_CONFIG_PATH):
        raise FileNotFoundError(
            f"config.yaml not found at expected path: {_CONFIG_PATH}"
        )
    with open(_CONFIG_PATH, 'r') as f:
        return yaml.safe_load(f)


def save_config(config_dict):
    """Save the configuration dictionary back to config.yaml.

    Args:
        config_dict: The configuration dictionary to persist.
    """
    with open(_CONFIG_PATH, 'w') as f:
        yaml.dump(config_dict, f, default_flow_style=False)
