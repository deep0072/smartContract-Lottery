const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");

const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts(); // get default deployer which is harhdat rn.
  const chainId = network.config.chainId;
  let vrfCoordinatorV2address, subscriptionId;
  console.log(!developmentChains.includes(network.name), "including...");
  if (developmentChains.includes(network.name)) {
    console.log("deploying");
    // check network is on local node or not as it is defined in helper config
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    ); // get the mock adress that is defined in contact/test/VRFCoordinatorV2MOCK.sol

    vrfCoordinatorV2address = vrfCoordinatorV2Mock.address;
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription(); // calling inbuilt subscription id function createSubscription
    const transReciept = await transactionResponse.wait(1);

    subscriptionId = transReciept.events[0].args.subId; // get the emitted id from solidity events
    /*
     fund the subscription 
     we need link token  on real network
    
    
    */
    console.log(chainId, "chainId");
    console.log(networkConfig[chainId], "chainid");

    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const entranceFee = networkConfig[chainId]["entranceFee"];
  console.log(entranceFee, "entrancefee");
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    vrfCoordinatorV2address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args, // these are the values that is defined in constructor in solidity file that we are going to deploy
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.Etherscan_API_KEY
  ) {
    log("verifying.....");

    await verify(raffle.address, args);
  }
  log("---------------------------------");
};

module.exports.tags = ["all", "raffle"];
