const assert = require("assert");
const to = require("../../lib/utils/to.js");
const initializeTestProvider = require("../helpers/web3/initializeTestProvider");

describe("Number can only safely store up to 53 bits", function() {
  it("should do things", async function() {
    const { web3 } = await initializeTestProvider();
    const BN = web3.utils.BN;

    let amount = web3.utils.toWei("1", "ether");
    const bigNumber = new BN(amount);

    let result = to.number(bigNumber);
    assert(result, "Error: Number can only safely store up to 53 bits");
  });
});
