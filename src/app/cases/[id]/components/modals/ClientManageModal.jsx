"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Building2, Search } from "lucide-react";

export default function ClientManageModal({
  open,
  onOpenChange,
  userSearchTerm,
  setUserSearchTerm,
  userSearchLoading,
  userSearchResults,
  orgSearchTerm,
  setOrgSearchTerm,
  orgSearchLoading,
  orgSearchResults,
  handleUserSearch,
  handleOrgSearch,
  handleAddUserClient,
  handleAddOrgClient,
  handleUserSearchKeyDown,
  handleOrgSearchKeyDown,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>의뢰인 추가</DialogTitle>
          <DialogDescription>
            이 사건에 의뢰인을 추가합니다. 개인 또는 법인/단체를 선택하세요.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="individual" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">
              <User className="mr-2 h-4 w-4" />
              개인
            </TabsTrigger>
            <TabsTrigger value="organization">
              <Building2 className="mr-2 h-4 w-4" />
              법인/단체
            </TabsTrigger>
          </TabsList>
          <TabsContent value="individual" className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="이름 또는 이메일로 검색"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  onKeyDown={handleUserSearchKeyDown}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={handleUserSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>

              {userSearchLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : userSearchResults.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {userSearchResults.map((user) => (
                      <Card
                        key={user.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleAddUserClient(user.id)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : userSearchTerm ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">검색 결과가 없습니다</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">이름 또는 이메일로 검색해주세요</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="organization" className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="회사명으로 검색"
                  value={orgSearchTerm}
                  onChange={(e) => setOrgSearchTerm(e.target.value)}
                  onKeyDown={handleOrgSearchKeyDown}
                  className="flex-1"
                />
                <Button type="button" variant="secondary" onClick={handleOrgSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  검색
                </Button>
              </div>

              {orgSearchLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : orgSearchResults.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {orgSearchResults.map((org) => (
                      <Card
                        key={org.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => handleAddOrgClient(org.id)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            <AvatarFallback>{org.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            {org.business_number && (
                              <p className="text-sm text-muted-foreground">
                                법인 번호: {org.business_number}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : orgSearchTerm ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">검색 결과가 없습니다</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">회사명으로 검색해주세요</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
