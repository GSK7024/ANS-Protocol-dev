"""Tests for ANS Python SDK"""

import pytest
from unittest.mock import Mock, patch
from ans import ANS, Agent, Escrow, ANSError


class TestANSClient:
    """Test ANS client initialization and basic methods."""
    
    def test_client_initialization(self):
        """Test client initializes with correct defaults."""
        client = ANS(api_key="test_key")
        
        assert client.api_key == "test_key"
        assert client.network == "mainnet"
        assert client.base_url == "https://ans.dev"
        assert client.timeout == 30
    
    def test_client_custom_config(self):
        """Test client with custom configuration."""
        client = ANS(
            api_key="test_key",
            base_url="https://custom.api.com",
            network="devnet",
            timeout=60
        )
        
        assert client.base_url == "https://custom.api.com"
        assert client.network == "devnet"
        assert client.timeout == 60
    
    def test_client_strips_trailing_slash(self):
        """Test base URL trailing slash is stripped."""
        client = ANS(api_key="test", base_url="https://api.com/")
        assert client.base_url == "https://api.com"


class TestAgentResolution:
    """Test agent resolution functionality."""
    
    @patch('ans.client.requests.Session')
    def test_resolve_agent(self, mock_session_class):
        """Test resolving an agent by name."""
        mock_session = Mock()
        mock_session_class.return_value = mock_session
        
        mock_response = Mock()
        mock_response.json.return_value = {
            "name": "marriott",
            "owner": "7xKXt...",
            "status": "active",
            "trust_score": 0.92,
            "trust_tier": "MASTER",
            "verified": True
        }
        mock_response.raise_for_status = Mock()
        mock_session.request.return_value = mock_response
        
        client = ANS(api_key="test_key")
        agent = client.resolve("marriott")
        
        assert agent.name == "marriott"
        assert agent.trust_tier == "MASTER"
        assert agent.trust_score == 0.92
        assert agent.verified is True
    
    def test_resolve_strips_prefix(self):
        """Test agent:// prefix is stripped."""
        client = ANS(api_key="test")
        
        with patch.object(client, '_request') as mock_request:
            mock_request.return_value = {"name": "test", "owner": "", "status": "active"}
            
            client.resolve("agent://marriott")
            
            mock_request.assert_called_with(
                "GET", 
                "/api/resolve", 
                params={"name": "marriott"}
            )


class TestAgent:
    """Test Agent dataclass."""
    
    def test_from_dict(self):
        """Test Agent creation from dictionary."""
        data = {
            "name": "test-agent",
            "owner": "wallet123",
            "status": "active",
            "trust_score": 0.75,
            "trust_tier": "ADEPT",
            "category": "Travel",
            "verified": False
        }
        
        agent = Agent.from_dict(data)
        
        assert agent.name == "test-agent"
        assert agent.owner == "wallet123"
        assert agent.trust_score == 0.75
        assert agent.category == "Travel"
    
    def test_from_dict_defaults(self):
        """Test Agent handles missing fields with defaults."""
        data = {"name": "minimal", "owner": "wallet", "status": "active"}
        
        agent = Agent.from_dict(data)
        
        assert agent.trust_score == 0.0
        assert agent.trust_tier == "INITIATE"
        assert agent.verified is False


class TestEscrow:
    """Test Escrow functionality."""
    
    def test_escrow_from_dict(self):
        """Test Escrow creation from dictionary."""
        data = {
            "id": "esc_123",
            "buyer_wallet": "buyer123",
            "seller_agent": "marriott",
            "amount": 2.5,
            "status": "locked",
            "service_details": "Hotel booking",
            "created_at": "2024-01-01T00:00:00Z"
        }
        
        escrow = Escrow.from_dict(data)
        
        assert escrow.id == "esc_123"
        assert escrow.amount == 2.5
        assert escrow.status == "locked"
    
    @patch('ans.client.requests.Session')
    def test_create_escrow(self, mock_session_class):
        """Test creating an escrow."""
        mock_session = Mock()
        mock_session_class.return_value = mock_session
        
        mock_response = Mock()
        mock_response.json.return_value = {
            "id": "esc_new",
            "buyer_wallet": "buyer",
            "seller_agent": "seller",
            "amount": 1.0,
            "status": "pending",
            "service_details": "Test",
            "created_at": "2024-01-01"
        }
        mock_response.raise_for_status = Mock()
        mock_session.request.return_value = mock_response
        
        client = ANS(api_key="test")
        escrow = client.escrow.create(
            seller="seller",
            amount=1.0,
            service_details="Test"
        )
        
        assert escrow.id == "esc_new"
        assert escrow.status == "pending"


class TestErrors:
    """Test error handling."""
    
    def test_ans_error(self):
        """Test ANSError exception."""
        error = ANSError(message="Not found", code="NOT_FOUND")
        
        assert error.message == "Not found"
        assert error.code == "NOT_FOUND"
        assert str(error) == "Not found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
