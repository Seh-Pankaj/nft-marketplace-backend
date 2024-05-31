// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__NftAlreadyListed(uint256, address);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(
  address nftAddress,
  uint256 tokenId,
  uint256 price
);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace is ReentrancyGuard {
  // State Variables
  struct Listing {
    uint256 price;
    address seller;
  }

  // NFT address -> tokenId -> Listing
  mapping(address => mapping(uint256 => Listing)) private s_listings;

  // Seller address -> amount earned
  mapping(address => uint256) private s_proceeds;

  // Events
  event ItemListed(
    address indexed seller,
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 price
  );

  event ItemBought(
    address indexed buyer,
    address indexed nftAddress,
    uint256 indexed tokenId,
    uint256 price
  );

  event ItemCancelled(
    address indexed seller,
    address indexed nftAddress,
    uint256 indexed tokenId
  );

  // Modifiers //
  modifier notListed(
    address nftAddress,
    uint256 tokenId,
    address owner
  ) {
    Listing memory listing = s_listings[nftAddress][tokenId];
    if (listing.price > 0) {
      revert NftMarketplace__NftAlreadyListed(tokenId, owner);
    }
    _;
  }

  modifier isOwner(
    address nftAddress,
    uint256 tokenId,
    address spender
  ) {
    IERC721 nft = IERC721(nftAddress);
    address owner = nft.ownerOf(tokenId);
    if (spender != owner) {
      revert NftMarketplace__NotOwner();
    }
    _;
  }

  modifier isListed(address nftAddress, uint256 tokenId) {
    Listing memory listing = s_listings[nftAddress][tokenId];
    if (listing.price == 0) {
      revert NftMarketplace__NotListed(nftAddress, tokenId);
    }
    _;
  }

  // Main Functions //
  constructor() {}

  /**
   * @notice Method for listing your NFT on the marketplace
   * @param nftAddress Address of the NFT
   * @param tokenId Token Id of the NFT
   * @param price Sale price of the NFT
   * @dev People hold the ownership of their NFTs and allow marketplace contract to sell their NFT on their behalf.
   */
  // Owners can hold the NFT ownership and give only approval to marketplace to sell
  function listItem(
    address nftAddress,
    uint256 tokenId,
    uint256 price
  )
    external
    notListed(nftAddress, tokenId, msg.sender)
    isOwner(nftAddress, tokenId, msg.sender)
  {
    if (price <= 0) {
      revert NftMarketplace__PriceMustBeAboveZero();
    }

    IERC721 nft = IERC721(nftAddress);
    if (nft.getApproved(tokenId) != address(this)) {
      revert NftMarketplace__NotApprovedForMarketplace();
    }

    s_listings[nftAddress][tokenId] = Listing(price, msg.sender);

    emit ItemListed(msg.sender, nftAddress, tokenId, price);
  }

  /**
   * Function to buy item
   * @param nftAddress Address of the NFT
   * @param tokenId TokenId of the NFT
   * @dev NFT should already be listed for this to work
   */
  function buyItem(
    address nftAddress,
    uint256 tokenId
  ) external payable nonReentrant isListed(nftAddress, tokenId) {
    Listing memory listedItem = s_listings[nftAddress][tokenId];
    if (msg.value < listedItem.price) {
      revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
    }
    s_proceeds[listedItem.seller] =
      s_proceeds[listedItem.seller] +
      listedItem.price;
    delete (s_listings[nftAddress][tokenId]);

    // We make all our state changes before transferring NFT because not doing this may lead to Re-entrancy attack
    IERC721(nftAddress).safeTransferFrom(
      listedItem.seller,
      msg.sender,
      tokenId
    );

    // Emit event Item bought
    emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
  }

  /**
   * This is a function to cancel a present listing
   * @param nftAddress Address of the NFT contract
   * @param tokenId Token Id of the NFT
   * @dev NFT should already be listed for this to work
   * @dev Only owner can call this function
   */
  function cancelListing(
    address nftAddress,
    uint256 tokenId
  )
    external
    isOwner(nftAddress, tokenId, msg.sender)
    isListed(nftAddress, tokenId)
  {
    delete (s_listings[nftAddress][tokenId]);
    emit ItemCancelled(msg.sender, nftAddress, tokenId);
  }

  /**
   *
   * @param nftAddress Address of the NFT contract
   * @param tokenId Token Id of the NFT
   * @param newPrice Updated Price of the NFT
   * @dev Only owner can update its price
   * @dev NFT should already be listed for this function to run
   */
  function updateListing(
    address nftAddress,
    uint256 tokenId,
    uint256 newPrice
  )
    external
    isListed(nftAddress, tokenId)
    isOwner(nftAddress, tokenId, msg.sender)
  {
    s_listings[nftAddress][tokenId].price = newPrice;
    emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
  }

  /**
   * A function to withraw NFT sold amount to the seller
   * @dev Fails if no amount is due
   */
  function withdrawProceeds() external {
    uint256 proceeds = s_proceeds[msg.sender];
    if (proceeds <= 0) {
      revert NftMarketplace__NoProceeds();
    }
    s_proceeds[msg.sender] = 0;

    (bool success, ) = payable(msg.sender).call{value: proceeds}("");
    if (!success) {
      revert NftMarketplace__TransferFailed();
    }
  }

  // Getter Functions

  function getListing(
    address nftAddress,
    uint256 tokenId
  ) external view returns (Listing memory) {
    return s_listings[nftAddress][tokenId];
  }

  function getProceeds(address seller) external view returns (uint256 amount) {
    return s_proceeds[seller];
  }
}
