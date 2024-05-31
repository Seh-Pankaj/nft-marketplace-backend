const { network, ethers, deployments } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { assert } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Basic NFT Tests", () => {
      let deployer, basicNft;
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        const deploys = await deployments.fixture(["basicNft"]);
        basicNft = await ethers.getContractAt(
          "BasicNFT",
          deploys.BasicNFT.address,
        );
      });

      it("initializes constructor correctly", async () => {
        const nftName = await basicNft.name();
        const nftSymbol = await basicNft.symbol();
        const tokenId = await basicNft.getTokenCounter();
        assert.equal(nftName, "Dogs");
        assert.equal(nftSymbol, "DOG");
        assert.equal(tokenId, 0);
      });

      describe("Mint NFT Tests", () => {
        beforeEach(async () => {
          await basicNft.mintNFT();
        });

        it("increments the token counter", async () => {
          const tokenCounter = await basicNft.getTokenCounter();
          assert.equal(tokenCounter, 1);
        });

        it("shows the correct owner and balance of NFT", async () => {
          const deployerAddress = deployer.address;
          const owner = await basicNft.ownerOf(0);
          const contractBalance = await basicNft.balanceOf(deployerAddress);

          assert.equal(owner, deployerAddress);
          assert.equal(contractBalance, 1);
        });
      });
    });
