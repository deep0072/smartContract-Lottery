// Raffle
// enter the lottery amount
//pick a random winner
//winner to selected every X minutes -> completely automate
//Chainlink Oracle -> Randomness,Automated Execution

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

error Raffle_NotEnoughEthEntered();
error Raffle_TransferFailed();

contract Raffle is VRFConsumerBaseV2 {
    // now create entrance fee

    uint256 private immutable i_entranceFee;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    // how many confirmations the Chainlink node should wait before responding
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    uint32 private immutable i_callbackGasLimit;
    address[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    // lottery variable
    address private s_recentWinner;

    /* Events */

    event RaffleEnter(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed randomWinner);

    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId, // subscription id require short so thats why it is 64 bit
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            //checking entrance fee is more than enough or not
            revert Raffle_NotEnoughEthEntered();
        }

        // now adding sender into player list who pay sufficeint fund
        s_players.push(payable(msg.sender));

        //emit an event  when sender added in array
        emit RaffleEnter(msg.sender);
    }

    /* this function  request for random word and gives the request id */
    function requestRandomWinner() external {
        //request random number
        // once we get it do something with it
        // 2 transaction process
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId, // id that require to fund the request
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit, /*limit for how much gas to use for the callback request to your contract's fulfillRandomWords()*/
            NUM_WORDS // how many random words we want to get
        );

        emit RequestedRaffleWinner(requestId);
    }

    // once we get the random words then get random winner
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length; // get index of winner
        address payable recent_winner = s_players[indexOfWinner]; // pick actual winner from array
        (bool success, ) = recent_winner.call({value: address(this).balance})(
            ""
        ); // send all lottery or balace of this contract to this winner

        if (!success) {
            revert Raffle_TransferFailed();
        }
        s_recentWinner = recent_winner; // set the address of winner to storage vaubale
        emit WinnerPicked(recent_winner);
    }

    //read entrance Fee
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint index) public view returns (address) {
        return (s_players[index]);
    }
}
