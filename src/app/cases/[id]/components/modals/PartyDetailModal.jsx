"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Edit, Trash2, AlertOctagon } from "lucide-react";

export default function PartyDetailModal({
  open,
  onOpenChange,
  parties,
  onEditParty,
  onRemoveParty,
  user,
  getPartyTypeColor,
}) {
  console.log(parties);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>당사자 정보</DialogTitle>
          <DialogDescription>이 사건에 포함된 모든 당사자의 정보를 확인합니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          {parties.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <AlertOctagon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>등록된 당사자가 없습니다.</p>
            </div>
          ) : (
            [...parties]
              .sort((a, b) => {
                const isMainPartyA = ["plaintiff", "creditor", "applicant"].includes(a.party_type);
                const isMainPartyB = ["plaintiff", "creditor", "applicant"].includes(b.party_type);

                if (isMainPartyA && !isMainPartyB) return -1;
                if (!isMainPartyA && isMainPartyB) return 1;
                return 0;
              })
              .map((party, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 dark:bg-gray-800 p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          getPartyTypeColor ? getPartyTypeColor(party.party_type) : ""
                        )}
                      >
                        {party.party_type === "plaintiff"
                          ? "원고"
                          : party.party_type === "defendant"
                          ? "피고"
                          : party.party_type === "creditor"
                          ? "채권자"
                          : party.party_type === "debtor"
                          ? "채무자"
                          : party.party_type === "applicant"
                          ? "신청인"
                          : party.party_type === "respondent"
                          ? "피신청인"
                          : party.party_type}
                      </Badge>
                      <h3 className="font-medium text-sm">
                        {party.entity_type === "individual" ? party.name : party.company_name}
                      </h3>
                    </div>
                    {user && (user.role === "admin" || user.role === "staff") && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEditParty(party)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => onRemoveParty(party.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="text-sm space-y-1">
                      {party.entity_type === "corporation" && (
                        <>
                          {party.company_name && (
                            <p>
                              <span className="font-medium mr-2">법인/단체명:</span>
                              <span>{party.company_name}</span>
                            </p>
                          )}
                          {party.name && (
                            <p>
                              <span className="font-medium mr-2">대표자 이름:</span>
                              <span>{party.name}</span>
                            </p>
                          )}
                          {party.position && (
                            <p>
                              <span className="font-medium mr-2">대표자 직위:</span>
                              <span>{party.position}</span>
                            </p>
                          )}
                          {party.corporate_number && (
                            <p>
                              <span className="font-medium mr-2">법인등록번호:</span>
                              <span>{party.corporate_number}</span>
                            </p>
                          )}
                        </>
                      )}
                      {party.entity_type === "individual" && (
                        <>
                          {party.name && (
                            <p>
                              <span className="font-medium mr-2">이름:</span>
                              <span>{party.name}</span>
                            </p>
                          )}
                          {party.resident_number && (
                            <p>
                              <span className="font-medium mr-2">주민등록번호:</span>
                              <span>{party.resident_number}</span>
                            </p>
                          )}
                        </>
                      )}
                      {party.phone && (
                        <p>
                          <span className="font-medium mr-2">연락처:</span>
                          <span>{party.phone}</span>
                        </p>
                      )}
                      {party.email && (
                        <p>
                          <span className="font-medium mr-2">이메일:</span>
                          <span>{party.email}</span>
                        </p>
                      )}
                      {party.address && (
                        <p>
                          <span className="font-medium mr-2">주소:</span>
                          <span>{party.address}</span>
                        </p>
                      )}
                      {!party.phone &&
                        !party.email &&
                        !party.address &&
                        !party.resident_number &&
                        party.entity_type === "individual" && (
                          <p className="text-gray-500 dark:text-gray-400 italic">
                            추가 정보가 없습니다.
                          </p>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
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
