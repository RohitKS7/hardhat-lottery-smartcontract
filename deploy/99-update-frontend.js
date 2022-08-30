const { ethers } = require("hardhat")
const { frontEndContractsFile, frontEndAbiFile } = require("../helper-hardhat-config")
const fs = require("fs")

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating Front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Frontend written!")
    }
}

async function updateAbi() {
    const lottery = await ethers.getContract("Lottery")
    fs.writeFileSync(frontEndAbiFile, lottery.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddresses() {
    const lottery = await ethers.getContract("Lottery")
    const chainId = network.config.chainId.toString()
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf-8"))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId].includes(lottery.address)) {
            contractAddresses[chainId].push(lottery.address)
        }
        contractAddress[chainId] = [lottery.address]
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}
