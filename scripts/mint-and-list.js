const { ethers, deployments } = require("hardhat");

const mintAndList = async () => {
  const PRICE = ethers.parseEther("0.1");
  const { BasicNFT, NftMarketplace } = await deployments.all();
  const basicNft = await ethers.getContractAt("BasicNFT", BasicNFT.address);
  const nftMarketplace = await ethers.getContractAt(
    "NftMarketplace",
    NftMarketplace.address,
  );

  const mintTxn = await basicNft.mintNFT();
  const txnRes = await mintTxn.wait(1);
  const tokenId = txnRes.logs[0].args.tokenId;
  // console.log(tokenId);

  console.log("Approving NFT...");
  const approveTxnRes = await basicNft.approve(nftMarketplace.target, tokenId);
  await approveTxnRes.wait(1);

  console.log("Listing NFT...");
  const listTxn = await nftMarketplace.listItem(
    basicNft.target,
    tokenId,
    PRICE,
  );
  await listTxn.wait(1);
  console.log("Listed!");
};

mintAndList()
  .then(() => process.exit(0))
  .catch((e) => {
    console.log(e);
    process.exit(1);
  });
