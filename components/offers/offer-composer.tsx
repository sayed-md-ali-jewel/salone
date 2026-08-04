"use client";

import { useMemo, useState } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = {
  id: string;
  name: string;
  mobile: string;
};

type OfferComposerProps = {
  customers: Customer[];
};

function cleanPhone(value: string) {
  return value.replace(/[^\d]/g, "");
}

function encode(value: string) {
  return encodeURIComponent(value);
}

export function OfferComposer({ customers }: OfferComposerProps) {
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [customName, setCustomName] = useState("");
  const [customMobile, setCustomMobile] = useState("");
  const [email, setEmail] = useState("");
  const [offerTitle, setOfferTitle] = useState("Special grooming offer");
  const [message, setMessage] = useState("Enjoy our exclusive grooming package at Royale Arab Men's Club. Book your appointment today.");

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const customerName = selectedCustomer?.name || customName || "Valued customer";
  const mobile = selectedCustomer?.mobile || customMobile;
  const fullMessage = useMemo(() => `Dear ${customerName},\n\n${message}\n\nRoyale Arab Men's Club`, [customerName, message]);
  const whatsappHref = mobile ? `https://wa.me/${cleanPhone(mobile)}?text=${encode(fullMessage)}` : "";
  const telegramHref = `https://t.me/share/url?text=${encode(fullMessage)}`;
  const emailHref = `mailto:${email}?subject=${encode(offerTitle)}&body=${encode(fullMessage)}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Customer</Label>
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} - {customer.mobile}</option>)}
            <option value="">Custom recipient</option>
          </select>
        </div>
        {!selectedCustomer && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={customName} onChange={(event) => setCustomName(event.target.value)} /></div>
            <div className="space-y-2"><Label>Mobile</Label><Input value={customMobile} onChange={(event) => setCustomMobile(event.target.value)} /></div>
          </div>
        )}
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="customer@example.com" /></div>
        <div className="space-y-2"><Label>Offer Title</Label><Input value={offerTitle} onChange={(event) => setOfferTitle(event.target.value)} /></div>
        <div className="space-y-2">
          <Label>Custom Message</Label>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold">Message Preview</h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{fullMessage}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild disabled={!mobile}>
            <a href={whatsappHref || "#"} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          </Button>
          <Button asChild variant="outline">
            <a href={telegramHref} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />Telegram</a>
          </Button>
          <Button asChild variant="outline" disabled={!email}>
            <a href={emailHref} target="_blank" rel="noreferrer"><Mail className="h-4 w-4" />Email</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
