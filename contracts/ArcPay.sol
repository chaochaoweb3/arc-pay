// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ArcPay — simple USDC payment links on Arc
/// @notice Arc uses native USDC as gas (18 decimals). Invoices are
///         denominated in native USDC and paid with `msg.value`,
///         so no ERC-20 approval is needed: paying is one tx.
contract ArcPay {
    struct Invoice {
        address recipient;
        uint256 amount; // in native USDC wei (18 decimals)
        string memo;
        bool paid;
    }

    Invoice[] public invoices;

    event InvoiceCreated(
        uint256 indexed id,
        address indexed recipient,
        uint256 amount,
        string memo
    );
    event InvoicePaid(
        uint256 indexed id,
        address indexed payer,
        uint256 amount
    );

    /// @notice Create a payment request. Returns its id.
    function createInvoice(
        uint256 amount,
        string calldata memo
    ) external returns (uint256) {
        require(amount > 0, "ArcPay: amount is zero");
        invoices.push(Invoice(msg.sender, amount, memo, false));
        uint256 id = invoices.length - 1;
        emit InvoiceCreated(id, msg.sender, amount, memo);
        return id;
    }

    /// @notice Pay an invoice with native USDC. Exact amount required.
    function payInvoice(uint256 id) external payable {
        require(id < invoices.length, "ArcPay: invoice not found");
        Invoice storage inv = invoices[id];
        require(!inv.paid, "ArcPay: already paid");
        require(msg.value == inv.amount, "ArcPay: wrong amount");
        inv.paid = true;
        (bool ok, ) = inv.recipient.call{value: msg.value}("");
        require(ok, "ArcPay: transfer failed");
        emit InvoicePaid(id, msg.sender, msg.value);
    }

    function invoiceCount() external view returns (uint256) {
        return invoices.length;
    }

    function getInvoice(
        uint256 id
    )
        external
        view
        returns (address recipient, uint256 amount, string memory memo, bool paid)
    {
        require(id < invoices.length, "ArcPay: invoice not found");
        Invoice storage inv = invoices[id];
        return (inv.recipient, inv.amount, inv.memo, inv.paid);
    }
}
