"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { FileText, Eye } from "lucide-react";

interface TabsNavigationProps {
  activeTab: "create" | "preview";
  onTabChange: (tab: "create" | "preview") => void;
  createContent: React.ReactNode;
  previewContent: React.ReactNode;
}

const TabsNavigation: React.FC<TabsNavigationProps> = ({
  activeTab,
  onTabChange,
  createContent,
  previewContent,
}) => {
  return (
    <Tabs 
      defaultValue="create" 
      value={activeTab}
      onValueChange={(value) => onTabChange(value as "create" | "preview")}
      className="w-full mb-6"
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Create Invoice
        </TabsTrigger>
        <TabsTrigger value="preview" className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview Invoice
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="create" className="mt-6">
        {createContent}
      </TabsContent>
      
      <TabsContent value="preview" className="mt-6">
        {previewContent}
      </TabsContent>
    </Tabs>
  );
};

export default TabsNavigation;