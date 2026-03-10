"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { User, Building2, Trash2 } from "lucide-react";

export default function ClientDetailModal({ open, onOpenChange, clients, onRemoveClient, user }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>의뢰인 상세 정보</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {clients.map((client, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {client.client_type === "individual" ? (
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <User className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                        <Building2 className="h-5 w-5 text-amber-500 dark:text-amber-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-lg">
                        {client.client_type === "individual"
                          ? client.individual_name
                          : client.organization_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {client.client_type === "individual" ? "개인 의뢰인" : "법인/단체 의뢰인"}
                        {client.position && ` · ${client.position}`}
                      </p>
                    </div>
                  </div>
                  {user && (user.role === "admin" || user.role === "staff") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                      onClick={() => onRemoveClient(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
