// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/KeeperCompatible.sol";

error Lottery__UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 LotteryState);
error Lottery__SendMoreToEnterLottery();
error Lottery__TransferFailed();
error Lottery__NotOpen();

/** @title A Sample Lottery Contract
 * @author Rohit Kumar Suman
 * @notice This contract is for creating an untamperable  decentralized smart contract
 * @dev This implements Chainlink VRF v2 and Chainlink Keepers
 */
contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    // Type Declarations
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    // State Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    bytes32 private immutable i_gaslane;
    uint64 private immutable i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;

    // LOTTERY (state) VARIABLES
    address private s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    // Events
    event LotteryEnter(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    // FUNCTIONS
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gaslane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_entranceFee = entranceFee;
        i_gaslane = gaslane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_interval = interval;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__SendMoreToEnterLottery();
        }
        // if lottery is not open for any reason
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }

        s_players.push(payable(msg.sender));
        // Emit an event when we update a dynamic array or mapping
        emit LotteryEnter(msg.sender);
    }

    /**
     * @dev This is the function that the chainlink keeper nodes call they look for the `upKeepNeeded` to return true.
     * The following conditions should be true in order to return true:
     * 1. The lottery is open.
     * 2. The time interval has passed between lottery runs.
     * 3. The contract has ETH.
     * 4. Implicity, your subscription is funded with LINK.
     */
    // SECTION Check UpKeep Function **************************************************
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (
            bool upKeepNeeded,
            bytes memory /*performData*/
        )
    {
        bool isOpen = LotteryState.OPEN == s_lotteryState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upKeepNeeded = (timePassed && isOpen && hasPlayers && hasBalance);
        // return (upKeepNeeded, "0x0"); // can we comment this out?
    }

    /**
     * @dev Once `checkUpkeep` is returning `true`, this function is called
     * and it kicks off a Chainlink VRF call to get a random winner.
     */
    function performUpkeep(
        bytes calldata /*performData*/
    ) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Lottery__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lotteryState)
            );
        }
        s_lotteryState = LotteryState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gaslane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    /**
     * @dev This is the function that Chainlink VRF node
     * calls to send the money to the random winner.
     */
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_lotteryState = LotteryState.OPEN;
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(recentWinner);
    }

    /** @notice Getter Functions */

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentwinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
