const networkConfig = {
    // default: {
    //     name: "hardhat",
    //     keepersUpdateInterval: "30",
    // },
    31337: {
        name: "localhost",
        entranceFee: "100000000000000000", // 0.1 ETH
        // subscriptionId: "588",
        gaslane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
        callbackGasLimit: "500000", // 500,000 gas
        interval: "1",
    },
    5: {
        name: "goreli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        subscriptionId: "0",
        entranceFee: "100000000000000000", // 0.1 ETH
        gaslane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
        callbackGasLimit: "500000", // 500,000 gas
        interval: "30",
    },
    // 1: {
    //     name: "mainnet",
    //     keepersUpdateInterval: "30",
    // },
}

const developmentChains = ["hardhat", "localhost"]
// const VERIFICATION_BLOCK_CONFIRMATIONS = 6
// const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
// const frontEndAbiFile = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"

module.exports = {
    networkConfig,
    developmentChains,
    // VERIFICATION_BLOCK_CONFIRMATIONS,
    // frontEndContractsFile,
    // frontEndAbiFile,
}
