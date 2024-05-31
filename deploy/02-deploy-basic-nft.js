const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config.js");
const { verify } = require("../utils/verfiy.js");

module.exports = async ({ deployments, getNamedAccounts }) => {
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  let args = [];

  const basicNft = await deploy("BasicNFT", {
    from: deployer,
    log: true,
    args: args,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API) {
    await verify(basicNft.address, args);
    console.log("Basic NFT Contract Verified");
  }
  console.log("------------------------------------");
};

module.exports.tags = ["all", "basicNft"];
