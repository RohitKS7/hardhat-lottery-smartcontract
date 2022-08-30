const { ethers, network } = require("hardhat")
const { frontEndContractsFile, frontEndAbiFile } = require("../helper-hardhat-config")
const fs = require("fs")

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating Front end...")
        await updateCurrentAddresses()
        await updateAbi()
        console.log("Frontend written!")
    }
}

async function updateAbi() {
    const lottery = await ethers.getContract("Lottery")
    fs.writeFileSync(frontEndAbiFile, lottery.interface.format(ethers.utils.FormatTypes.json))
}

async function updateCurrentAddresses() {
    const lottery = await ethers.getContract("Lottery")
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    const chainId = network.config.chainId.toString()
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId].inculdes(lottery.address)) {
            contractAddresses[chainId].push(lottery.address)
        }
    } else {
        contractAddresses[chainId] = [lottery.address]
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend"]
