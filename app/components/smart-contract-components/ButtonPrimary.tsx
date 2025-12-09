import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  
}

const ButtonPrimary = ({ children, className = "", ...props }: ButtonProps) => {
  return (
    <button
      {...props}
      className={`bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-5 py-2 rounded shadow-sm font-inter ${className}`}
    >
      {children}
    </button>
  );
};

export default ButtonPrimary;
