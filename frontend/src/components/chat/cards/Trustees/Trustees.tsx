import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import TrusteeCard from './TrusteeCard';

import holla from "../../../../assets/trusties/trustie 1.jpeg";
import padma from "../../../../assets/trusties/truste 2.jpg";
import srinivas from "../../../../assets/trusties/trustie 3.jpg";
import shanmukha from "../../../../assets/trusties/trustie 4.jpg";
import manohar from "../../../../assets/trusties/trustie 5.jpeg";
import jayasimha from "../../../../assets/trusties/trustie 6.jpg";
import narayan from "../../../../assets/trusties/trustie 7.jpg";

const trustees = [
  {
    name: "Prof. M R Holla",
    role: "Founder Trustee & President",
    description: "Prof. M R Holla is a distinguished academician and recipient of the Karnataka Rajyothsava Award for Academic Excellence. With over 50 years of academic and administrative experience, he serves as the visionary leader and core architect of SVIT.",
    image: holla
  },
  {
    name: "Dr. A M Padma Reddy",
    role: "Founder Trustee & Vice President",
    description: "Dr. A M Padma Reddy is a renowned professor in Computer Science and Engineering and Dean of Student Affairs. He promotes quality education and encourages participation in sports, cultural, NSS, and NCC activities.",
    image: padma
  },
  {
    name: "Sri R Srinivas Raju",
    role: "Managing Trustee & Secretary",
    description: "Sri R Srinivas Raju is a serial entrepreneur with over 30 years of experience in infrastructure and business development. His industry insights strengthen SVIT's practical approach to engineering education.",
    image: srinivas
  },
  {
    name: "Prof. R C Shanmukha Swamy",
    role: "Founder Trustee & Joint Secretary",
    description: "Prof. R C Shanmukha Swamy brings extensive academic and administrative expertise, contributing to SVIT's policies and strategic direction with decades of educational experience.",
    image: shanmukha
  },
  {
    name: "Sri Manohar M K",
    role: "Founder Trustee & Treasurer",
    description: "Sri Manohar M K is a Chartered Accountant managing SVIT's financial operations, ensuring strong fiscal discipline and sustainable institutional growth.",
    image: manohar
  },
  {
    name: "Dr. Y Jayasimha",
    role: "Founder Trustee",
    description: "Dr. Y Jayasimha is an accomplished academician contributing to SVIT's development through academic leadership and institutional growth strategies.",
    image: jayasimha
  },
  {
    name: "Sri Narayan Raju",
    role: "Founder Trustee (Deceased)",
    description: "Sri Narayan Raju was a key administrator in SVIT's foundation, whose contributions to institutional systems and governance remain part of its legacy.",
    image: narayan
  }
];

export default function Trustees() {
  const [index, setIndex] = useState(0);

  // Slideshow auto-advance: 4 seconds per card
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % trustees.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-[800px] mx-auto flex items-center justify-center">
      <AnimatePresence mode="wait">
        <TrusteeCard
          key={index}
          name={trustees[index].name}
          role={trustees[index].role}
          description={trustees[index].description}
          image={trustees[index].image}
        />
      </AnimatePresence>
    </div>
  );
}
