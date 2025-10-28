"use client";

import { useState, useEffect } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useUserContextData } from "../context/userData";
import Link from "next/link";
import Swal from "sweetalert2";
import FeeDisplay from "./FeeDisplay";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import PinPopOver from "./PinPopOver";
import TransactionSummary from "./TransactionSummary";

interface Bank {
  name: string;
  code: string;
}

interface P2PDetails {
  name: string;
  id: string;
}

type PaymentMethod = "checkout" | "virtual_account" | "bank_transfer";

export default function Transfer() {
  const inputCount = 4;
  const [isOpen, setIsOpen] = useState(false);
  const [transferType, setTransferType] = useState<
    "my-account" | "other-bank" | "p2p"
  >("my-account");
  const [amount, setAmount] = useState<string>("");
  const [bankCode, setBankCode] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [recepientAcc, setRecepientAcc] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loading2, setLoading2] = useState<boolean>(false);
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [walletDetails, setWalletDetails] = useState<any>(null);
  const [p2pDetails, setP2pDetails] = useState<P2PDetails | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { userData } = useUserContextData();
  const [monthlyVolume, setMonthlyVolume] = useState<number>(0);
  const [pin, setPin] = useState(Array(inputCount).fill(""));
  // Popover state for searchable bank select
  const [open, setOpen] = useState(false);
  const [confirmTransaction, setConfirmTransaction] = useState(false);
  const [search, setSearch] = useState("");

  // Filter banks dynamically
  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(search.toLowerCase())
  );

  // Handle bank selection
  const handleSelectBank = (bank: Bank) => {
    setBankName(bank.name);
    setBankCode(bank.code);
    setOpen(false);
    setSearch("");
  };

  // Fetch monthly volume
  useEffect(() => {
    if (!userData?.id) return;
    const fetchVolumes = async () => {
      try {
        const res = await fetch(
          `/api/get-monthly-volumes?userId=${userData.id}`
        );
        const data = await res.json();
        setMonthlyVolume(data.monthlyVolume || 0);
      } catch (err) {
        console.error(err);
      }
    };
    fetchVolumes();
  }, [userData?.id]);

  // Fetch user & bank details
  useEffect(() => {
    if (!userData?.id) return;

    const fetchDetails = async () => {
      setLoading2(true);
      try {
        const [accountRes, banksRes] = await Promise.all([
          fetch("/api/get-wallet-account-details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userData.id }),
          }),
          fetch("/api/banks"),
        ]);

        const accountData = accountRes.ok ? await accountRes.json() : {};
        const banksData = banksRes.ok ? await banksRes.json() : {};
        setUserDetails(accountData || {});
        setBanks(banksData?.data || []);
      } catch (err) {
        console.error("Error fetching details:", err);
        setUserDetails(null);
        setWalletDetails(null);
        setBanks([]);
      } finally {
        setLoading2(false);
      }
    };

    fetchDetails();
  }, [userData?.id]);

  // Bank account lookup
  useEffect(() => {
    if (transferType !== "other-bank") return;
    if (accountNumber.length !== 10 || !bankCode) return;

    const timeout = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch("/api/bank-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankCode, accountNumber }),
        });
        const data = res.ok ? await res.json() : null;
        const acctName = data?.data?.accountName;
        if (acctName) {
          setAccountName(acctName);
          setErrors((prev) => ({ ...prev, accountNumber: "" }));
        } else {
          setAccountName("");
          setErrors((prev) => ({
            ...prev,
            accountNumber: data?.message || "Account lookup failed.",
          }));
        }
      } catch (err: any) {
        setAccountName("");
        setErrors((prev) => ({
          ...prev,
          accountNumber: err?.message || "Could not verify account.",
        }));
      } finally {
        setLookupLoading(false);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [accountNumber, bankCode, transferType]);

  // P2P lookup
  useEffect(() => {
    if (transferType !== "p2p") return;
    if (!recepientAcc || recepientAcc.length < 6) return;

    if (recepientAcc === userData?.walletAccountNumber) {
      setP2pDetails(null);
      setErrors((prev) => ({
        ...prev,
        recepientAcc: "You cannot transfer to your own account.",
      }));
      return;
    }

    const timeout = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch("/api/find-user-wallet-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accNumber: recepientAcc }),
        });
        const data = res.ok ? await res.json() : null;

        if (data?.receiverName || data?.full_name) {
          setP2pDetails({
            name: data.receiverName || data.full_name,
            id: data.walletId,
          });
          setErrors((prev) => ({ ...prev, recepientAcc: "" }));
        } else {
          setP2pDetails(null);
          setErrors((prev) => ({
            ...prev,
            recepientAcc: data?.message || "User not found.",
          }));
        }
      } catch (err: any) {
        setP2pDetails(null);
        setErrors((prev) => ({
          ...prev,
          recepientAcc: err?.message || "Could not verify account.",
        }));
      } finally {
        setLookupLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [recepientAcc, transferType]);

  // 1. Actual transfer logic
  const performTransfer = async () => {
    setLoading(true);
    try {
      const payload: any = {
        userId: userData?.id,
        senderName: `${userData?.firstName} ${userData?.lastName}`,
        amount: Number(amount),
        narration,
        type: transferType,
        pin, // include the collected PIN
      };

      if (transferType === "my-account") {
        payload.bankCode = userDetails.p_bank_code;
        payload.accountNumber = userDetails.p_account_number;
        payload.accountName = userDetails.p_account_name;
      }

      if (transferType === "other-bank") {
        payload.bankCode = bankCode;
        payload.accountNumber = accountNumber;
        payload.accountName = accountName;
      }

      if (transferType === "p2p") {
        payload.receiverAccountId = p2pDetails?.id;
      }

      const endpoint =
        transferType === "p2p" ? "/api/p2p-transfer" : "/api/transfer-balance";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: "success",
          title: "Transfer Successful",
          text: "Your transaction has been processed successfully.",
        }).then(() => {
          window.location.reload();
        });

        // Reset form
        setAmount("");
        setAccountNumber("");
        setAccountName("");
        setNarration("");
        setRecepientAcc("");
        setBankCode("");
        setBankName("");
        setPin(Array(inputCount).fill(""));
        setErrors({});
      } else {
        Swal.fire({
          icon: "error",
          title: "Transfer Failed",
          text: data?.message,
        });
        setErrors({ form: data?.message || "Transfer failed." });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Something went wrong",
        text: err?.message || "Please try again later.",
      });
      setErrors({ form: err?.message || "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { [key: string]: string } = {};

    // Validate amount, narration, recipient fields BEFORE PIN
    if (!amount || Number(amount) <= 0)
      newErrors.amount = "Enter a valid amount.";
    if (!narration) newErrors.narration = "Narration is required.";
    if (narration.length > 100) newErrors.narration = "Narration too long.";

    if (
      transferType === "my-account" &&
      (!userDetails?.p_account_number || !userDetails?.p_account_name)
    ) {
      newErrors.myAccount = "Your bank details are incomplete.";
    }

    if (transferType === "other-bank") {
      if (!bankCode || !accountNumber || !accountName) {
        newErrors.otherBank = "Please complete all bank fields.";
      }
      if (
        accountNumber &&
        (accountNumber.length !== 10 || !/^\d+$/.test(accountNumber))
      ) {
        newErrors.accountNumber = "Account number must be 10 digits.";
      }
    }

    if (transferType === "p2p" && (!recepientAcc || !p2pDetails?.id)) {
      newErrors.recepientAcc = "Recipient not found or invalid.";
    }

    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join("<br>");
      Swal.fire({
        icon: "error",
        title: "Validation Failed",
        html: errorMessages,
      });
      setErrors(newErrors);

      return;
    }
    setConfirmTransaction(true);
  };

  const isDisabled =
    loading ||
    !amount ||
    !narration ||
    Number(amount) <= 0 ||
    (transferType === "my-account" && !userDetails?.p_account_number) ||
    (transferType === "other-bank" &&
      (!bankCode || !accountNumber || !accountName)) ||
    (transferType === "p2p" && (!recepientAcc || !p2pDetails?.id));

  // Determine payment method for FeeDisplay - FIXED TYPE
  const getPaymentMethod = (): PaymentMethod => {
    if (transferType === "my-account" || transferType === "other-bank") {
      return "bank_transfer";
    }
    return "bank_transfer"; // Default for P2P as well
  };

  return (
    <>
      <PinPopOver
        setIsOpen={setIsOpen}
        isOpen={isOpen}
        pin={pin}
        setPin={setPin}
        inputCount={inputCount}
        onConfirm={() => {
          if (!pin || pin.length !== 4) {
            Swal.fire({
              icon: "error",
              title: "Invalid PIN",
              text: "PIN must be 4 digits",
            });
            return;
          }

          setIsOpen(false);
          performTransfer();
        }}
      />
      <Card className="shadow-xl border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Transfer Funds
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how you want to transfer funds from your wallet.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleTransfer} className="space-y-6">
            {/* Transfer Type */}
            <div className="space-y-2">
              <Label>Transfer Type</Label>
              <Select
                value={transferType}
                onValueChange={(value) =>
                  setTransferType(value as "my-account" | "other-bank" | "p2p")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my-account">My Bank Account</SelectItem>
                  <SelectItem value="other-bank">Other Bank Account</SelectItem>
                  <SelectItem value="p2p">Zidwell User (P2P)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
              />
              {transferType !== "p2p" && (
                <FeeDisplay
                  type="transfer"
                  amount={Number(amount) || undefined}
                  paymentMethod={getPaymentMethod()}
                />
              )}
              {errors.amount && (
                <p className="text-red-600 text-sm">{errors.amount}</p>
              )}
            </div>

            {/* My Account */}
            {transferType === "my-account" && (
              <>
                {loading2 ? (
                  <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-600 animate-pulse">
                    Loading your bank details...
                  </div>
                ) : userDetails?.p_account_number &&
                  userDetails?.p_account_name ? (
                  <div className="bg-gray-50 p-3 rounded-lg border space-y-1 text-sm">
                    <p>
                      <strong>Bank:</strong> {userDetails.p_bank_name}
                    </p>
                    <p>
                      <strong>Account Number:</strong>{" "}
                      {userDetails.p_account_number}
                    </p>
                    <p>
                      <strong>Account Name:</strong>{" "}
                      {userDetails.p_account_name}
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-50 p-3 rounded-lg border text-sm text-red-600">
                    You have not set your bank account details yet.{" "}
                    <Link
                      href="/dashboard/profile"
                      className="text-blue-500 hover:underline"
                    >
                      Click here
                    </Link>{" "}
                    to add them.
                    {errors.myAccount && (
                      <p className="text-red-600 text-sm">{errors.myAccount}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Other Bank */}
            {transferType === "other-bank" && (
              <>
                <div className="space-y-1">
                  <Label>Select Bank Name</Label>

                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex justify-between items-center border rounded px-3 py-2 text-sm"
                        aria-expanded={open}
                      >
                        {bankName || "Search bank..."}
                        <ChevronsUpDown className="h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search bank..."
                          value={search}
                          onValueChange={setSearch}
                          autoFocus
                        />
                        <CommandList>
                          <CommandEmpty>No bank found.</CommandEmpty>
                          <CommandGroup>
                            {filteredBanks.map((bank) => (
                              <CommandItem
                                key={bank.code}
                                onSelect={() => handleSelectBank(bank)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    bankCode === bank.code
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {bank.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {errors.otherBank && (
                    <p className="text-red-600 text-sm">{errors.otherBank}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input
                    type="number"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="10-digit account number"
                  />
                  {errors.accountNumber && (
                    <p className="text-red-600 text-sm">
                      {errors.accountNumber}
                    </p>
                  )}
                </div>

                {lookupLoading && (
                  <p className="text-[#C29307] text-sm flex items-center gap-2">
                    <Loader2 className="animate-spin" /> Verifying account...
                  </p>
                )}
                {accountName && !errors.accountNumber && (
                  <p className="text-green-600 text-sm font-semibold">
                    Account Name: {accountName}
                  </p>
                )}
              </>
            )}

            {/* P2P */}
            {transferType === "p2p" && (
              <div className="space-y-1">
                <Label>Account Number (Zidwell User)</Label>
                <Input
                  type="number"
                  value={recepientAcc}
                  onChange={(e) => setRecepientAcc(e.target.value)}
                  placeholder="0234******"
                />
                {errors.recepientAcc && (
                  <p className="text-red-600 text-sm">{errors.recepientAcc}</p>
                )}
                {lookupLoading && (
                  <p className="text-[#C29307] text-sm flex items-center gap-2">
                    <Loader2 className="animate-spin" /> Verifying account...
                  </p>
                )}
                {p2pDetails?.name && !errors.recepientAcc && (
                  <p className="text-green-600 text-sm font-semibold">
                    Account Name: {p2pDetails.name}
                  </p>
                )}
              </div>
            )}

            {/* Narration */}
            <div className="space-y-1">
              <Label>
                Narration{" "}
                <span className="text-sm">(purpose of transaction)</span>
              </Label>
              <Input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="e.g. Food"
                maxLength={100}
              />
            </div>
            {errors.narration && (
              <p className="text-red-600 text-sm">{errors.narration}</p>
            )}

            <Button
              type="submit"
              disabled={isDisabled}
              className="w-full bg-[#C29307] hover:bg-[#b28a06] text-white md:w-[200px]"
            >
              {loading ? "Processing..." : "Transfer Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <TransactionSummary
        senderName={`${userData?.firstName} ${userData?.lastName}`}
        senderAccount={`Nomba ${userData?.firstName}`}
        recipientName={accountName || p2pDetails?.name || userDetails?.p_account_name}
        recipientAccount={accountNumber || userDetails?.p_account_number || recepientAcc}
        recipientBank={bankName || userDetails?.p_bank_name || "Zidwell"}
        purpose={narration}
        amount={amount}
        fee={monthlyVolume}
        confirmTransaction={confirmTransaction}
        onBack={() => setConfirmTransaction(false)}
        onConfirm={() => {
          setConfirmTransaction(false);
          setIsOpen(true);
        }}
        paymentMethod={getPaymentMethod()}
      />
    </>
  );
}