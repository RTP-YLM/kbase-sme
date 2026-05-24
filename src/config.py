"""
Configuration Loader
Load and validate config from YAML file
"""
import os
import re
import yaml
from pathlib import Path
from typing import Any, Dict
from dotenv import load_dotenv


class Config:
    """Configuration manager for RAG application"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = Path(config_path)
        load_dotenv()
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file and expand ${ENV_VAR} values"""
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_path}")
        
        with open(self.config_path, "r") as f:
            raw = f.read()
        
        # Expand ${VAR_NAME} placeholders from environment/.env
        pattern = re.compile(r"\$\{([A-Z0-9_]+)\}")
        raw = pattern.sub(lambda m: os.getenv(m.group(1), ""), raw)
        return yaml.safe_load(raw)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get nested config value using dot notation"""
        keys = key.split(".")
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    @property
    def llm(self) -> Dict[str, Any]:
        """LLM configuration"""
        return self.get("llm", {})
    
    @property
    def rag(self) -> Dict[str, Any]:
        """RAG configuration"""
        return self.get("rag", {})
    
    @property
    def app(self) -> Dict[str, Any]:
        """App configuration"""
        return self.get("app", {})
    
    @property
    def logging(self) -> Dict[str, Any]:
        """Logging configuration"""
        return self.get("logging", {})
    
    def __repr__(self) -> str:
        return f"Config({self.config_path})"


# Global config instance
_config: Config = None


def get_config() -> Config:
    """Get global config instance"""
    global _config
    if _config is None:
        _config = Config()
    return _config


def reload_config(config_path: str = "config.yaml") -> Config:
    """Reload configuration from file"""
    global _config
    _config = Config(config_path)
    return _config
