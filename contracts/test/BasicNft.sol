// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BasicNFT is ERC721 {
  string private constant TOKEN_URI =
    "ipfs://QmeGhS7Fk84wVQdeGsC8eWYbkBU6aJBvQd2z1zGmQ2ZWFi/";
  uint256 private s_tokenCounter;

  constructor() ERC721("Dogs", "DOG") {
    s_tokenCounter = 0;
  }

  function mintNFT() public returns (uint256) {
    s_tokenCounter++;
    _safeMint(msg.sender, s_tokenCounter);

    return s_tokenCounter;
  }

  function getTokenCounter() public view returns (uint256) {
    return s_tokenCounter;
  }

  function tokenURI(
    uint256 /* tokenId */
  ) public pure override returns (string memory) {
    return TOKEN_URI;
  }

  function msgSender() public view returns (address) {
    return msg.sender;
  }
}
