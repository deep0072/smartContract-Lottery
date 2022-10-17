const { assert } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle unit test", async function () {
      let raffle, vrfCoordinateMock;

      beforeEach(async function () {
        const { deployer } = await getNamedAccounts();
        await deployments.fixture(["all"]); // deploying contracts that are mentioned as tag all in deploy folder's files
        raffle = await ethers.getContract("Raffle", deployer);
        vrfCoordinateMock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        ); // get deployed contract with help deployer
      });

      describe("Constructor", async function () {
        it("intialize the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState(); // it will return in to 0 and 1 which is true false by definition but these are uint 256
          // need to convert into the string

          assert.equal(raffleState.toString(), "0"); // testing raffle state is equal to 0 or not
          const raffleInterval = await raffle.getInterval();
          assert.equal(raffleState.toString(), "0");
        });
      });
    });
