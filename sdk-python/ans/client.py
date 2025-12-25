"""
ANS Protocol Python SDK

A Python client for interacting with the Agent Name Service protocol.

Installation:
    pip install ans-protocol

Usage:
    from ans import ANS
    
    client = ANS(api_key="your_api_key")
    agent = client.resolve("marriott")
    print(agent.name, agent.trust_tier)
"""

import requests
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum


class TrustTier(Enum):
    SOVEREIGN = "SOVEREIGN"
    MASTER = "MASTER"
    ADEPT = "ADEPT"
    INITIATE = "INITIATE"


class EscrowStatus(Enum):
    PENDING = "pending"
    LOCKED = "locked"
    RELEASED = "released"
    REFUNDED = "refunded"


@dataclass
class Agent:
    """Represents an ANS agent/domain."""
    name: str
    owner: str
    status: str
    trust_score: float = 0.0
    trust_tier: str = "INITIATE"
    endpoints: Optional[Dict[str, str]] = None
    category: Optional[str] = None
    verified: bool = False
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Agent":
        return cls(
            name=data.get("name", ""),
            owner=data.get("owner", ""),
            status=data.get("status", "active"),
            trust_score=data.get("trust_score", 0.0),
            trust_tier=data.get("trust_tier", "INITIATE"),
            endpoints=data.get("endpoints"),
            category=data.get("category"),
            verified=data.get("verified", False),
        )


@dataclass
class Escrow:
    """Represents an escrow transaction."""
    id: str
    buyer_wallet: str
    seller_agent: str
    amount: float
    status: str
    service_details: str
    created_at: str
    expires_at: Optional[str] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Escrow":
        return cls(
            id=data.get("id", ""),
            buyer_wallet=data.get("buyer_wallet", ""),
            seller_agent=data.get("seller_agent", ""),
            amount=data.get("amount", 0.0),
            status=data.get("status", "pending"),
            service_details=data.get("service_details", ""),
            created_at=data.get("created_at", ""),
            expires_at=data.get("expires_at"),
        )


class ANSError(Exception):
    """Base exception for ANS SDK errors."""
    def __init__(self, message: str, code: str = "UNKNOWN"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class ANS:
    """
    ANS Protocol Python SDK Client.
    
    Example:
        client = ANS(api_key="your_api_key")
        agent = client.resolve("marriott")
        
        # Create escrow
        escrow = client.escrow.create(
            seller="marriott",
            amount=2.5,
            service_details="Hotel booking"
        )
    """
    
    DEFAULT_BASE_URL = "https://ans.dev"
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        network: str = "mainnet",
        timeout: int = 30
    ):
        """
        Initialize the ANS client.
        
        Args:
            api_key: Your ANS API key
            base_url: Custom API base URL (optional)
            network: 'mainnet' or 'devnet'
            timeout: Request timeout in seconds
        """
        self.api_key = api_key
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip("/")
        self.network = network
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-ANS-Network": network,
        })
        
        # Initialize sub-clients
        self.escrow = EscrowClient(self)
    
    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make an API request."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except:
                pass
            raise ANSError(
                message=error_data.get("error", str(e)),
                code=error_data.get("code", "HTTP_ERROR")
            )
        except requests.exceptions.RequestException as e:
            raise ANSError(message=str(e), code="REQUEST_ERROR")
    
    def resolve(self, name: str) -> Agent:
        """
        Resolve an agent by name.
        
        Args:
            name: Agent name (with or without 'agent://' prefix)
            
        Returns:
            Agent object with details
            
        Example:
            agent = client.resolve("marriott")
            print(agent.trust_tier)  # "MASTER"
        """
        clean_name = name.replace("agent://", "").replace("dev.agent://", "")
        data = self._request("GET", f"/api/resolve", params={"name": clean_name})
        return Agent.from_dict(data)
    
    def discover(
        self,
        category: Optional[str] = None,
        limit: int = 10,
        verified: Optional[bool] = None
    ) -> List[Agent]:
        """
        Discover available agents.
        
        Args:
            category: Filter by category (Travel, Finance, etc.)
            limit: Maximum results to return
            verified: Filter by verification status
            
        Returns:
            List of Agent objects
        """
        params = {"limit": limit}
        if category:
            params["category"] = category
        if verified is not None:
            params["verified"] = str(verified).lower()
        
        data = self._request("GET", "/api/discover", params=params)
        agents = data.get("agents", [])
        return [Agent.from_dict(a) for a in agents]
    
    def search(self, query: str, limit: int = 10) -> List[Agent]:
        """
        Search for agents by query.
        
        Args:
            query: Search query string
            limit: Maximum results
            
        Returns:
            List of matching Agent objects
        """
        data = self._request("GET", "/api/search", params={"q": query, "limit": limit})
        agents = data.get("agents", [])
        return [Agent.from_dict(a) for a in agents]


class EscrowClient:
    """Sub-client for escrow operations."""
    
    def __init__(self, client: ANS):
        self._client = client
    
    def create(
        self,
        seller: str,
        amount: float,
        service_details: str,
        timeout_hours: int = 24
    ) -> Escrow:
        """
        Create a new escrow transaction.
        
        Args:
            seller: Seller agent name
            amount: Amount in SOL
            service_details: Description of service
            timeout_hours: Hours before auto-refund
            
        Returns:
            Escrow object
        """
        data = self._client._request("POST", "/api/escrow", json={
            "seller": seller.replace("agent://", ""),
            "amount": amount,
            "service_details": service_details,
            "timeout_hours": timeout_hours,
        })
        return Escrow.from_dict(data)
    
    def get(self, escrow_id: str) -> Escrow:
        """Get escrow by ID."""
        data = self._client._request("GET", f"/api/escrow/{escrow_id}")
        return Escrow.from_dict(data)
    
    def list(self, role: str = "buyer") -> List[Escrow]:
        """
        List escrows for current user.
        
        Args:
            role: 'buyer' or 'seller'
        """
        data = self._client._request("GET", "/api/escrow", params={"role": role})
        escrows = data.get("escrows", [])
        return [Escrow.from_dict(e) for e in escrows]
    
    def release(self, escrow_id: str, proof: Optional[str] = None) -> Escrow:
        """Release escrow funds to seller."""
        data = self._client._request("POST", f"/api/escrow/{escrow_id}/release", json={
            "proof": proof
        })
        return Escrow.from_dict(data)
    
    def refund(self, escrow_id: str, reason: Optional[str] = None) -> Escrow:
        """Refund escrow to buyer."""
        data = self._client._request("POST", f"/api/escrow/{escrow_id}/refund", json={
            "reason": reason
        })
        return Escrow.from_dict(data)


# Convenience function
def create_client(api_key: str, **kwargs) -> ANS:
    """Create an ANS client instance."""
    return ANS(api_key=api_key, **kwargs)
