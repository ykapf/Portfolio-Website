// AnimatedButton.js
import { motion } from "framer-motion";
import Link from "next/link";

interface ButtonProps {
  href: string;
  buttonText: string;
}

const borderVariants = {
  initial: { width: "80%" },
  hover: {
    width: "0%",
    transition: {
      duration: 0.5,
      ease: "easeInOut",
    },
  },
};

const wrapperVariants = {
  hover: {},
};

const Button: React.FC<ButtonProps> = ({ href, buttonText }) => {
  return (
    <Link href={href}>
      <motion.div
        className="flex flex-row justify-center items-center   w-[calc(100%)] h-[calc(100%)] grayscale"
        style={{ position: "relative", display: "inline-block" }}
        variants={wrapperVariants}
        initial="initial"
        whileHover="hover"
      >
        {/* The Button */}
        <motion.button
          className="z-20 custom-cursor-clickable cursor-none relative flex items-center justify-center rounded-3xl      border-[#f5f0e6] bg-black text-[#f5f0e6] p-[0px] px-[20px] text-[25px]  w-[calc(100%)] h-[calc(100%)]"
          style={{
            borderTop: "1px solid transparent",
            borderBottom: "1px solid transparent",
          }}
        >
          {buttonText}
        </motion.button>
        {/*  Border */}
        <div className="-z-10 flex flex-grow justify-center items-center ">
          <div className="-z-10 flex items-center justify-center rounded-3xl    py-[5px] px-[25px] text-[25px]         absolute top-[-1px] left-[-1px] w-[100%] h-[calc(100%+2px)] bg-[#f5f0e6] origin-left"></div>
          <motion.div
            className="z-10 flex items-center justify-center                    py-[5px] text-[25px]                   absolute top-[-1px] w-[0px] h-[calc(100%+2px)] bg-black origin-center"
            variants={borderVariants}
          ></motion.div>
          <div className="-z-10 flex items-center justify-center rounded-3xl    py-[5px]  px-[25px] text-[25px]        absolute top-[-1px] right-[-1px] w-[100%] h-[calc(100%+2px)] bg-[#f5f0e6] origin-right"></div>
        </div>
      </motion.div>
    </Link>
  );
};

export default Button;
