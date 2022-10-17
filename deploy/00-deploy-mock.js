const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const BASE_FEE = "250000000000000000"; // 0.25 is the premium. it costs 0.25 link per request
const GAS_PRICE_LINK = 1e9; // 1000000000 calcucated gas value based om gas price of chain or link per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  const args = [BASE_FEE, GAS_PRICE_LINK];
  console.log(network.name, "network name");
  if (developmentChains.includes(network.name)) {
    log("local network detected, deploying mocks...");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args,
    });

    log("mock deployed");
    log("----------------------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
