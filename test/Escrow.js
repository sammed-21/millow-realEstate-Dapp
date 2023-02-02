const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  let buyer, seller, inspector, lender;
  let realEstate, escrow, transaction;
  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();
    // console.log(buyer.address);
    //deploy realestate contract
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    //mint
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://dweb.link/ipfs/QmV1LTxbXjnr69RUJogqwiFgTcrPhYfc4uzfGDAyEunXVD?filename=docs.openzeppelin.com_contracts_3.x_erc721"
      );
    await transaction.wait();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();
    transaction = await escrow
      .connect(seller)
      .list(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });

  describe("deployment", async () => {
    it("Return NFT address", async () => {
      // setup accounts

      let result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });
    it("Return lender", async () => {
      // setup accounts

      let result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
    it("Return inspector ", async () => {
      // setup accounts

      let result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });
    it("Return seller", async () => {
      // setup accounts

      let result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });
  });
  describe("Listing", async () => {
    // it("check the seller", async () => {
    //   expect(await transaction.).to.be.equal(seller.address);
    //   // expect(owner).to.be.equal(seller.address);
    // });
    it("Return Buyer", async () => {
      let result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });
    it("return purchase price", async () => {
      let result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });
    it("return escrowAmount", async () => {
      let result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });

    it("updated is listed", async () => {
      let result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });
    it("updating the ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });
  });
  describe("Deposite", () => {
    it("check the balance of contract", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositEarlist(1, { value: tokens(5) });
      await transaction.wait();
      let result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
  });
  describe("inspection", () => {
    it("check the inspection status", async () => {
      let tx = await escrow.connect(inspector).updateInspectionStatus(1, true);
      await tx.wait();
      let result = await escrow.inspectionPassed(1);
      expect(result).to.be.equal(true);
    });
  });
  describe("approval", () => {
    it("check the check approval status", async () => {
      let tx = await escrow.connect(seller).approveSale(1);
      await tx.wait();
      tx = await escrow.connect(lender).approveSale(1);
      await tx.wait();
      tx = await escrow.connect(buyer).approveSale(1);
      await tx.wait();
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
    });
  });
  describe("Sales", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarlist(1, { value: tokens(5) });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      transaction = await escrow.connect(seller).finalizeSale(1);
      await transaction.wait();
    });
    it("update the ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });
    it("update balance ", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });

    // it("Updates ownership", async () => {
    //   expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    // });

    // it("Updates balance", async () => {
    //   expect(await escrow.getBalance()).to.be.equal(0);
    // });
  });
  describe("cancel ", () => {
    it("cancel the sale ", async () => {
      let tx = await escrow.connect(inspector).updateInspectionStatus(1, false);
      await tx.wait();
      let result = await escrow.cancelSale(1);

      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
