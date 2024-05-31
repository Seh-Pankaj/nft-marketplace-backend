const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config.js");
const { verify } = require("../utils/verfiy.js");

module.exports = async ({ deployments, getNamedAccounts }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  args = [];

  const nftMarketPlace = await deploy("NftMarketplace", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API) {
    await verify(nftMarketPlace.address, args);
    console.log("Marketplace Contract Verified");
  }
  console.log("-----------------------------------");
};

module.exports.tags = ["all", "nftmarketplace"];
