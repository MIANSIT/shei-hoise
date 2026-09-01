"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ContactUSForm from "@/app/components/contactUs/ContactUsForm";
import Modal from "@/app/components//common/Modal"; // Import the modal component
import { useTranslation } from "@/lib/hook/useTranslation";
import { useGsapScope } from "@/lib/gsap/useGsapScope";

export default function CTASection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslation();

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // The closing ask. Rises as one block rather than line by line — at the end
  // of a long scroll the reader wants a single clear thing to do, not another
  // sequence to sit through.
  const scope = useGsapScope(({ q, root, reduced, gsap }) => {
    const targets = q("[data-reveal]");

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      targets,
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: root, start: "top 75%", once: true },
      },
    );
  });

  return (
    <section
      ref={scope as React.RefObject<HTMLElement>}
      id='request-demo'
      className='py-16 md:py-20 px-6 bg-muted/50 border border-chart-2/20'
    >
      <div className='container mx-auto text-center'>
        <h2 data-reveal className='text-3xl md:text-4xl font-bold mb-6'>
          {t.landing.ctaTitle}
        </h2>

        <p
          data-reveal
          className='text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto'
        >
          {t.landing.ctaSubtitle}
        </p>

        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Button
            onClick={openModal}
            variant='outline'
            size='lg'
            className='border-chart-2 text-chart-2 hover:bg-chart-2/10 px-6 md:px-8 py-3 text-base md:text-lg'
          >
            {t.landing.guidedTour}
          </Button>
        </div>

        <p className='mt-4 text-xs md:text-sm text-muted-foreground'>
          {t.landing.ctaFine}
        </p>
      </div>

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <ContactUSForm
          source='demo_request'
          title='Request for Your Free Demo'
          subtitle='Fill out the form and one of our specialists will reach out to you shortly.'
          buttonText='Demo Request'
        />
      </Modal>
    </section>
  );
}
