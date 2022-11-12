const { ethers, network } = require("hardhat");
const fs = require("fs");
const { json } = require("hardhat/internal/core/params/argumentTypes");

const FRONT_END_ADDRESSES_FILE =
  "../../smartcontractlottery-frontend/constants/contractAdresses.json";

const FRONT_END_ABI_FILE =
  "../../smartcontractlottery-frontend/constants/abi.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("updating front end");
    updateContractAddress();
    updateAbi();
  }
};

async function updateAbi() {
  const raffle = await ethers.getContract("Raffle");
  fs.writeFileSync(
    FRONT_END_ABI_FILE,
    raffle.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddress() {
  //get that contract address

  const raffle = await ethers.getContract("Raffle");
  const chainId = network.config.chainId.toString();
  const currentAddress = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE),
    "utf-8"
  );

  // now check chain id exist in address json file or not

  if (chainId in currentAddress) {
    // if chain id exist
    if (!currentAddress[chainId].include(raffle.address)) {
      // already existed key dont contain address
      currentAddress[chainId].push(raffle.address); // add the existing the address to that chain id
    }
  } else {
    currentAddress[chainId] = [raffle.address]; // otherwise add chain id with newly deployed contract address
  }

  // now write updated id and contract address in json

  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddress));
}

module.exports.tags = ["all", "frontend"];
