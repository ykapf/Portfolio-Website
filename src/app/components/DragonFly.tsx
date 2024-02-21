import { motion } from "framer-motion";

const DragonFly = () => {
  const wingVariants = {
    flap: {
      scaleX: [0.8, 1, 0.8], // Sequence of scaling: normal, shrink, unshrink, back to normal
      transition: {
        repeat: Infinity, // Repeat the animation indefinitely
        repeatType: "loop" as const, // Ensure the repeat type is recognized as a specific literal
        duration: 1.75, // Duration of one flap cycle
      },
    },
  };

  return (
    <div className="w-fit flex flex-row">
      <motion.img
        src="left-wing.png "
        className=" "
        variants={wingVariants}
        animate="flap"
        style={{ originX: 1, originY: 0.5 }} // Adjust if necessary for your image
      />
      <motion.img
        src="right-wing.png "
        className=" "
        variants={wingVariants}
        animate="flap"
        style={{ originX: 0, originY: 0.5 }} // Adjust if necessary for your image
      />
    </div>
  );
};

export default DragonFly;
