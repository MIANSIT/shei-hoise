"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import ContactUSForm from "@/app/components/contactUs/ContactUsForm";
import Modal from "@/app/components//common/Modal"; // Import the modal component

export default function CTASection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <section id= "request-demo" className="py-16 md:py-20 px-6 bg-muted/50 border border-chart-2/20">
      <div className="container mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-6"
        >
          Ready to Transform Your Store Management?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
        >
          Join hundreds of store owners who are already using Shei-Hoise to
          streamline their business operations.
        </motion.p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={openModal}
            variant="outline"
            size="lg"
            className="border-chart-2 text-chart-2 hover:bg-chart-2/10 px-6 md:px-8 py-3 text-base md:text-lg"
          >
            Request For Demo
          </Button>
        </div>

        <p className="mt-4 text-xs md:text-sm text-muted-foreground">
          No credit card required • 14-day free trial • Setup in minutes
        </p>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <ContactUSForm
          source="demo_request"
          title="Request for Your Free Demo"
          subtitle="Fill out the form and one of our specialists will reach out to you shortly."
          buttonText="Demo Request"
        />
      </Modal>
    </section>
  );
}
