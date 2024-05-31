const { network, deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { expect, assert } = require("chai");
const { ZeroAddress } = require("ethers");

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("NFT Marketplace Tests", () => {
      let nftMarketplace,
        nftMarketplaceAddress,
        basicNft,
        deployedBasicNFTAddress,
        deployer,
        player;
      const PRICE = ethers.parseEther("0.01");
      const TOKEN_ID = 0;

      beforeEach(async () => {
        ({ deployer } = await getNamedAccounts());
        const deploys = await deployments.fixture("all");
        basicNft = await ethers.getContractAt(
          "BasicNFT",
          deploys.BasicNFT.address,
        );
        const mintTxn = await basicNft.mintNFT();
        const txnReceipt = await mintTxn.wait(1);
        deployedBasicNFTAddress = txnReceipt.to;

        nftMarketplace = await ethers.getContractAt(
          "NftMarketplace",
          deploys.NftMarketplace.address,
        );
        nftMarketplaceAddress = nftMarketplace.target;

        await basicNft.approve(nftMarketplaceAddress, TOKEN_ID);
      });

      describe("List Item Tests", () => {
        it("Reverts if NFT is already listed", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          await expect(
            nftMarketplace.listItem(deployedBasicNFTAddress, TOKEN_ID, PRICE),
          )
            .to.be.revertedWithCustomError(
              nftMarketplace,
              "NftMarketplace__NftAlreadyListed",
            )
            .withArgs(TOKEN_ID, deployer);
        });

        it("Reverts if someone else other than owner tries to list item", async () => {
          const signers = await ethers.getSigners();
          player = signers[1];
          const playerMarketplace = nftMarketplace.connect(player);
          await expect(
            playerMarketplace.listItem(
              deployedBasicNFTAddress,
              TOKEN_ID,
              PRICE,
            ),
          ).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NotOwner()",
          );
        });

        it("Reverts if price is not met", async () => {
          await expect(
            nftMarketplace.listItem(deployedBasicNFTAddress, TOKEN_ID, 0),
          ).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__PriceMustBeAboveZero()",
          );
        });

        it("Reverts if nft marketplace is not approved to list NFT", async () => {
          await basicNft.approve(ZeroAddress, TOKEN_ID);
          await expect(
            nftMarketplace.listItem(deployedBasicNFTAddress, TOKEN_ID, PRICE),
          ).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NotApprovedForMarketplace()",
          );
        });

        it("Lists the NFT correctly", async () => {
          await expect(
            nftMarketplace.listItem(deployedBasicNFTAddress, TOKEN_ID, PRICE),
          )
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(deployer, deployedBasicNFTAddress, TOKEN_ID, PRICE);
        });

        it("Updates listing with seller and price", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          const listing = await nftMarketplace.getListing(
            deployedBasicNFTAddress,
            TOKEN_ID,
          );
          assert.equal(listing.seller, deployer);
          assert.equal(listing.price, PRICE);
        });
      });

      describe("Buy Item Tests", () => {
        beforeEach(async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
        });

        it("Reverts if item is not listed", async () => {
          await nftMarketplace.buyItem(deployedBasicNFTAddress, TOKEN_ID, {
            value: PRICE,
          });
          await expect(
            nftMarketplace.buyItem(deployedBasicNFTAddress, TOKEN_ID, {
              value: PRICE,
            }),
          )
            .to.be.revertedWithCustomError(
              nftMarketplace,
              "NftMarketplace__NotListed",
            )
            .withArgs(deployedBasicNFTAddress, TOKEN_ID);
        });

        it("Reverts if the buy price is below sell price", async () => {
          const listedPrice = (
            await nftMarketplace.getListing(deployedBasicNFTAddress, TOKEN_ID)
          ).price;
          await expect(
            nftMarketplace.buyItem(deployedBasicNFTAddress, TOKEN_ID, {
              value: PRICE - ethers.parseEther("0.001"),
            }),
          )
            .to.be.revertedWithCustomError(
              nftMarketplace,
              "NftMarketplace__PriceNotMet",
            )
            .withArgs(deployedBasicNFTAddress, TOKEN_ID, listedPrice);
        });

        it("Emits an event when item is bought, updates the owner and proceeds", async () => {
          await expect(
            nftMarketplace.buyItem(deployedBasicNFTAddress, TOKEN_ID, {
              value: PRICE,
            }),
          )
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(deployer, deployedBasicNFTAddress, TOKEN_ID, PRICE);

          const listing = await nftMarketplace.getListing(
            deployedBasicNFTAddress,
            TOKEN_ID,
          );
          const proceeds = await nftMarketplace.getProceeds(deployer);

          assert.equal(listing.price, BigInt("0"));
          assert.equal(listing.seller, ZeroAddress);
          assert.equal(proceeds, PRICE);
        });
      });

      describe("Cancel listing Tests", () => {
        it("Reverts with an error if the NFT is not already listed", async () => {
          await expect(
            nftMarketplace.cancelListing(deployedBasicNFTAddress, TOKEN_ID),
          )
            .to.be.revertedWithCustomError(
              nftMarketplace,
              "NftMarketplace__NotListed",
            )
            .withArgs(deployedBasicNFTAddress, TOKEN_ID);
        });

        it("Reverts with an error if someone other than owner tries to update listing", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          const signers = await ethers.getSigners();
          const player = signers[1];
          const playerMarketplace = nftMarketplace.connect(player);
          await expect(
            playerMarketplace.cancelListing(deployedBasicNFTAddress, TOKEN_ID),
          ).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NotOwner()",
          );
        });

        it("cancels the listing and emits an event on cancellation success", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          await expect(
            nftMarketplace.cancelListing(deployedBasicNFTAddress, TOKEN_ID),
          )
            .to.emit(nftMarketplace, "ItemCancelled")
            .withArgs(deployer, deployedBasicNFTAddress, TOKEN_ID);

          const listingInfo = await nftMarketplace.getListing(
            deployedBasicNFTAddress,
            TOKEN_ID,
          );
          const listingPrice = listingInfo.price;
          assert.equal(listingPrice, 0);
        });
      });

      describe("Updates listing Tests", () => {
        it("Reverts with an error if the NFT is not already listed", async () => {
          await expect(
            nftMarketplace.updateListing(
              deployedBasicNFTAddress,
              TOKEN_ID,
              PRICE,
            ),
          )
            .to.be.revertedWithCustomError(
              nftMarketplace,
              "NftMarketplace__NotListed",
            )
            .withArgs(deployedBasicNFTAddress, TOKEN_ID);
        });

        it("Reverts with an error if someone other than owner tries to update listing", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          const signers = await ethers.getSigners();
          const player = signers[1];
          const playerMarketplace = nftMarketplace.connect(player);
          await expect(
            playerMarketplace.updateListing(
              deployedBasicNFTAddress,
              TOKEN_ID,
              PRICE,
            ),
          ).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NotOwner()",
          );
        });

        it("updates the listing and emits an event on success", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          const newPrice = ethers.parseEther("0.02");
          await expect(
            nftMarketplace.updateListing(
              deployedBasicNFTAddress,
              TOKEN_ID,
              newPrice,
            ),
          )
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(deployer, deployedBasicNFTAddress, TOKEN_ID, newPrice);

          const listingInfo = await nftMarketplace.getListing(
            deployedBasicNFTAddress,
            TOKEN_ID,
          );
          const listingPrice = listingInfo.price;
          assert.equal(listingPrice, newPrice);
        });
      });

      describe("Withdraw Proceeds Tests", () => {
        it("Reverts if there no proceeds for the seller", async () => {
          await expect(
            nftMarketplace.withdrawProceeds(),
          ).to.be.revertedWithCustomError(
            nftMarketplace,
            "NftMarketplace__NoProceeds()",
          );
        });

        it("withdraws proceeds successfully!", async () => {
          await nftMarketplace.listItem(
            deployedBasicNFTAddress,
            TOKEN_ID,
            PRICE,
          );
          const player = (await ethers.getSigners())[1];
          const playerMarketplace = nftMarketplace.connect(player);
          await playerMarketplace.buyItem(deployedBasicNFTAddress, TOKEN_ID, {
            value: PRICE,
          });

          const initialDeployerBalance =
            await ethers.provider.getBalance(deployer);
          const initialDeployerProceeds =
            await nftMarketplace.getProceeds(deployer);

          const txnRes = await nftMarketplace.withdrawProceeds();
          const txnReceipt = await txnRes.wait(1);
          const { gasPrice, gasUsed } = txnReceipt;

          const totalGasCost = gasPrice * gasUsed;
          const finalDeployerBalance =
            await ethers.provider.getBalance(deployer);

          assert.equal(
            finalDeployerBalance + totalGasCost,
            initialDeployerBalance + initialDeployerProceeds,
          );
        });
      });
    });
