"""
LLM Provider Abstraction
Support multiple providers: OpenAI, Anthropic, Ollama, Alibaba
"""
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    def __init__(self, model: str, api_key: Optional[str] = None, base_url: Optional[str] = None, **kwargs):
        self.model = model
        self.api_key = api_key or os.getenv("LLM_API_KEY")
        self.base_url = base_url
        self.config = kwargs
    
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """Generate text from prompt"""
        pass
    
    @abstractmethod
    def generate_stream(self, prompt: str, **kwargs):
        """Generate text with streaming"""
        pass


class OllamaProvider(BaseLLMProvider):
    """Ollama local LLM provider"""
    
    def __init__(self, model: str, base_url: str = "http://localhost:11434/v1", **kwargs):
        super().__init__(model, api_key="ollama", base_url=base_url, **kwargs)
        try:
            from openai import OpenAI
            self.client = OpenAI(base_url=self.base_url, api_key=self.api_key)
        except ImportError:
            raise ImportError("Please install openai: pip install openai")
    
    def generate(self, prompt: str, **kwargs) -> str:
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    def generate_stream(self, prompt: str, **kwargs):
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class OpenAIProvider(BaseLLMProvider):
    """OpenAI API provider"""
    
    def __init__(self, model: str = "gpt-4o-mini", api_key: Optional[str] = None, base_url: Optional[str] = None, **kwargs):
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        base_url = base_url or os.getenv("OPENAI_BASE_URL")
        super().__init__(model, api_key=api_key, base_url=base_url, **kwargs)
        try:
            from openai import OpenAI
            # base_url รองรับ OpenAI-compatible endpoint (เช่น Xiaomi MiMo, Together, vLLM)
            self.client = OpenAI(api_key=self.api_key, base_url=self.base_url) if self.base_url \
                else OpenAI(api_key=self.api_key)
        except ImportError:
            raise ImportError("Please install openai: pip install openai")
    
    def generate(self, prompt: str, **kwargs) -> str:
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    def generate_stream(self, prompt: str, **kwargs):
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class AnthropicProvider(BaseLLMProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, model: str = "claude-3-5-sonnet-20241022", api_key: Optional[str] = None, **kwargs):
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        super().__init__(model, api_key=api_key, **kwargs)
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)
        except ImportError:
            raise ImportError("Please install anthropic: pip install anthropic")
    
    def generate(self, prompt: str, **kwargs) -> str:
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    
    def generate_stream(self, prompt: str, **kwargs):
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        
        with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield text


class AlibabaProvider(BaseLLMProvider):
    """Alibaba Cloud (Tongyi Qianwen) provider"""
    
    def __init__(self, model: str = "qwen-plus", api_key: Optional[str] = None, **kwargs):
        api_key = api_key or os.getenv("ALIBABA_API_KEY")
        super().__init__(model, api_key=api_key, **kwargs)
        try:
            from openai import OpenAI
            # Alibaba uses OpenAI-compatible API
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
            )
        except ImportError:
            raise ImportError("Please install openai: pip install openai")
    
    def generate(self, prompt: str, **kwargs) -> str:
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    def generate_stream(self, prompt: str, **kwargs):
        temperature = kwargs.get("temperature", self.config.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.config.get("max_tokens", 1024))
        
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


def get_llm_provider(provider_name: str, config: Dict[str, Any]) -> BaseLLMProvider:
    """Factory function to get LLM provider based on config"""
    
    providers = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "alibaba": AlibabaProvider,
    }
    
    if provider_name not in providers:
        raise ValueError(f"Unknown provider: {provider_name}. Available: {list(providers.keys())}")
    
    provider_class = providers[provider_name]
    return provider_class(
        model=config.get("model", "llama3.2"),
        api_key=config.get("api_key"),
        base_url=config.get("base_url"),
        temperature=config.get("temperature", 0.7),
        max_tokens=config.get("max_tokens", 1024),
    )
