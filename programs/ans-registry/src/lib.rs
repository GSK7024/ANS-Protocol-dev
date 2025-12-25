use anchor_lang::prelude::*;

declare_id!("ANSregXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

/// ANS Registry Program
/// 
/// On-chain domain registry for AI agents.
/// Similar to DNS but for agent://name resolution.

#[program]
pub mod ans_registry {
    use super::*;

    /// Register a new domain
    /// Creates a PDA owned by the caller
    pub fn register_domain(
        ctx: Context<RegisterDomain>,
        name: String,
        endpoint: String,
        category: String,
    ) -> Result<()> {
        require!(name.len() >= 3 && name.len() <= 32, AnsError::InvalidNameLength);
        require!(endpoint.len() <= 256, AnsError::EndpointTooLong);
        
        let domain = &mut ctx.accounts.domain;
        let clock = Clock::get()?;
        
        domain.name = name;
        domain.owner = ctx.accounts.owner.key();
        domain.endpoint = endpoint;
        domain.category = category;
        domain.created_at = clock.unix_timestamp;
        domain.expires_at = clock.unix_timestamp + (365 * 24 * 60 * 60); // 1 year
        domain.is_listed = false;
        domain.list_price = 0;
        domain.bump = ctx.bumps.domain;
        
        msg!("Domain registered: agent://{}", domain.name);
        
        Ok(())
    }

    /// Transfer domain ownership
    pub fn transfer_domain(
        ctx: Context<TransferDomain>,
        _name: String,
    ) -> Result<()> {
        let domain = &mut ctx.accounts.domain;
        
        // Clear listing status on transfer
        domain.owner = ctx.accounts.new_owner.key();
        domain.is_listed = false;
        domain.list_price = 0;
        
        msg!("Domain transferred to: {}", domain.owner);
        
        Ok(())
    }

    /// Update domain endpoint
    pub fn update_endpoint(
        ctx: Context<UpdateDomain>,
        _name: String,
        new_endpoint: String,
    ) -> Result<()> {
        require!(new_endpoint.len() <= 256, AnsError::EndpointTooLong);
        
        let domain = &mut ctx.accounts.domain;
        domain.endpoint = new_endpoint.clone();
        
        msg!("Endpoint updated: {}", new_endpoint);
        
        Ok(())
    }

    /// List domain for sale
    pub fn list_for_sale(
        ctx: Context<UpdateDomain>,
        _name: String,
        price_lamports: u64,
    ) -> Result<()> {
        require!(price_lamports > 0, AnsError::InvalidPrice);
        
        let domain = &mut ctx.accounts.domain;
        domain.is_listed = true;
        domain.list_price = price_lamports;
        
        msg!("Listed for {} lamports", price_lamports);
        
        Ok(())
    }

    /// Unlist domain from sale
    pub fn unlist(
        ctx: Context<UpdateDomain>,
        _name: String,
    ) -> Result<()> {
        let domain = &mut ctx.accounts.domain;
        domain.is_listed = false;
        domain.list_price = 0;
        
        Ok(())
    }

    /// Buy a listed domain (atomic swap)
    pub fn buy_domain(
        ctx: Context<BuyDomain>,
        _name: String,
    ) -> Result<()> {
        let domain = &mut ctx.accounts.domain;
        let clock = Clock::get()?;
        
        require!(domain.is_listed, AnsError::NotForSale);
        require!(domain.expires_at > clock.unix_timestamp, AnsError::DomainExpired);
        
        let price = domain.list_price;
        
        // Transfer SOL from buyer to seller
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, price)?;
        
        // Transfer ownership
        domain.owner = ctx.accounts.buyer.key();
        domain.is_listed = false;
        domain.list_price = 0;
        
        msg!("Domain sold for {} lamports", price);
        
        Ok(())
    }

    /// Renew domain (extend expiry by 1 year)
    pub fn renew_domain(
        ctx: Context<UpdateDomain>,
        _name: String,
    ) -> Result<()> {
        let domain = &mut ctx.accounts.domain;
        let clock = Clock::get()?;
        
        // Extend from current expiry or now (whichever is later)
        let base = std::cmp::max(domain.expires_at, clock.unix_timestamp);
        domain.expires_at = base + (365 * 24 * 60 * 60);
        
        msg!("Domain renewed until: {}", domain.expires_at);
        
        Ok(())
    }
}

// ============================================
// ACCOUNTS
// ============================================

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterDomain<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + DomainAccount::INIT_SPACE,
        seeds = [b"domain", name.as_bytes()],
        bump
    )]
    pub domain: Account<'info, DomainAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct TransferDomain<'info> {
    #[account(
        mut,
        seeds = [b"domain", name.as_bytes()],
        bump = domain.bump,
        has_one = owner
    )]
    pub domain: Account<'info, DomainAccount>,
    
    pub owner: Signer<'info>,
    
    /// CHECK: New owner, just a pubkey
    pub new_owner: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct UpdateDomain<'info> {
    #[account(
        mut,
        seeds = [b"domain", name.as_bytes()],
        bump = domain.bump,
        has_one = owner
    )]
    pub domain: Account<'info, DomainAccount>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct BuyDomain<'info> {
    #[account(
        mut,
        seeds = [b"domain", name.as_bytes()],
        bump = domain.bump,
    )]
    pub domain: Account<'info, DomainAccount>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    /// CHECK: Seller is validated via domain.owner
    #[account(
        mut,
        constraint = seller.key() == domain.owner @ AnsError::WrongSeller
    )]
    pub seller: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

// ============================================
// STATE
// ============================================

#[account]
#[derive(InitSpace)]
pub struct DomainAccount {
    #[max_len(32)]
    pub name: String,           // Domain name (e.g., "airindia")
    pub owner: Pubkey,          // Current owner
    #[max_len(256)]
    pub endpoint: String,       // API endpoint URL
    #[max_len(32)]
    pub category: String,       // Category (travel, shopping, etc.)
    pub created_at: i64,        // Unix timestamp
    pub expires_at: i64,        // Expiry timestamp
    pub is_listed: bool,        // For sale?
    pub list_price: u64,        // Price in lamports
    pub bump: u8,               // PDA bump
}

// ============================================
// ERRORS
// ============================================

#[error_code]
pub enum AnsError {
    #[msg("Domain name must be 3-32 characters")]
    InvalidNameLength,
    #[msg("Endpoint URL too long (max 256)")]
    EndpointTooLong,
    #[msg("Domain is not listed for sale")]
    NotForSale,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Wrong seller")]
    WrongSeller,
    #[msg("Domain has expired")]
    DomainExpired,
}
