import React from "react";
import { Button } from "../ui/button";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ButtonPrimary = ({ children, className = "", ...props }: ButtonProps) => {
  return (
    <Button
      {...props}
      className={`bg-[#C29307] hover:bg-[#C29307] text-white shadow-sm `}
    >
      {children}
    </Button>
  );
};

export default ButtonPrimary;
