import { Star, StarHalf, ArrowUp, Activity, FileCheck, Award, HeartPulse, CheckCircle, Download, ShieldAlert, Smartphone } from 'lucide-react';
import Image from 'next/image';
import HeroSlideshow from '@/components/HeroSlideshow';
import AnimateOnScroll from '@/components/AnimateOnScroll';

const apkDownloadUrl = process.env.NEXT_PUBLIC_APK_DOWNLOAD_URL || '/uploads/kerala-ayurvedh.apk';


export default function Home() {
  return (
    <div className="flex flex-col w-full bg-white text-slate-900 font-sans transition-colors duration-300">
      
      {/* Dynamic Slideshow Hero */}
      <HeroSlideshow />
      
      {/* Authentic Ayurvedh Product Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 transition-colors duration-300">
        <div className="max-w-6xl mx-auto grid gap-12 items-center lg:grid-cols-2">
          <AnimateOnScroll className="text-left">
            <p className="text-sm uppercase font-semibold tracking-[0.4em] text-brand-600 mb-4">
              Authentic Ayurvedh
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 transition-colors duration-300">
              A trusted Kerala Ayurvedh product
            </h2>
            <p className="text-slate-600 mb-8 max-w-2xl transition-colors duration-300">
              True weight loss is not about starving the body, it is about balancing your Agni (digestive fire) and listening to nature.
            </p>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition-colors duration-300">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <Award className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Crafted with authentic Ayurvedic methodology
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition-colors duration-300">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Balanced botanical blend for daily support
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition-colors duration-300">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <FileCheck className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Meets rigorous quality benchmarks in our specialized facilities
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition-colors duration-300">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Designed to support natural vitality and balance
                </p>
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll className="flex justify-center lg:justify-end">
            <div className="relative aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl">
              <Image
                src="/photo.jpeg"
                alt="Authentic Ayurvedh product"
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Values Card Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
        <div className="max-w-6xl mx-auto">
          <AnimateOnScroll className="mb-12 text-center">
            <p className="text-sm uppercase font-semibold tracking-[0.4em] text-brand-600 mb-3">Our Principles</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">What guides our Ayurvedh journey</h2>
          </AnimateOnScroll>

          <div className="space-y-8">
            {[
              {
                title: 'INTEGRITY',
                description: 'Every ingredient is carefully sourced and transparently selected to support your wellness with honesty.',
                image: '/images/card-integrity.jpeg',
              },
              {
                title: 'CLARITY',
                description: 'We share simple product information and guidance so you can choose with confidence and ease.',
                image: '/images/card-clarity.jpeg',
              },
              {
                image: '/images/harmony-large.jpeg',
                isLarge: true,
              },
            ].map((card) => (
              card.isLarge ? (
                <AnimateOnScroll key="harmony-image" className="overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm">
                  <div className="relative h-[420px] md:h-[520px] lg:h-[560px] overflow-hidden">
                    <Image src={card.image} alt="Harmony" fill sizes="(min-width: 1024px) 1152px, 100vw" className="object-cover" />
                  </div>
                </AnimateOnScroll>
              ) : (
                <AnimateOnScroll key={card.title} className="overflow-hidden">
                  <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1">
                    <div className="relative h-72 overflow-hidden bg-slate-100">
                      <Image src={card.image} alt={card.title ?? 'Kerala Ayurvedh principle'} fill sizes="(min-width: 768px) 1152px, 100vw" className="object-cover" />
                    </div>
                    <div className="p-8">
                      <h3 className="text-xl font-bold uppercase tracking-[0.3em] text-slate-900 mb-4">{card.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{card.description}</p>
                    </div>
                  </div>
                </AnimateOnScroll>
              )
            ))}
          </div>
        </div>
      </section>

      {/* Specialized Ayurvedh Wellness (Solid Green Section) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-brand-700 border-b border-brand-900 transition-colors duration-300">
         <div className="max-w-5xl mx-auto text-center">
           <AnimateOnScroll>
             <h2 className="text-3xl md:text-4xl font-bold text-white mb-16 leading-tight">
               Specialized <span className="text-brand-200 font-normal transition-colors">Ayurvedh Wellness</span><br />
               That Nourishes And Heals
             </h2>
           </AnimateOnScroll>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-12 gap-x-8">
             {[
               "Researched & crafted by Experts",
               "New-Age Formulations",
               "Decades of Experience",
               "Non Habit Forming"
             ].map((text, idx) => (
               <AnimateOnScroll key={idx} className="flex flex-col items-center">
                 <div className="w-16 h-16 rounded-full bg-brand-800/50 flex items-center justify-center text-white mb-4">
                   <CheckCircle className="w-8 h-8" />
                 </div>
                 <p className="text-sm text-white font-medium max-w-[150px]">{text}</p>
               </AnimateOnScroll>
             ))}
           </div>
         </div>
      </section>

      {/* App Download Section */}
      <section id="download-app" className="py-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-12 items-center lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <AnimateOnScroll>
                <p className="text-sm uppercase font-semibold tracking-[0.4em] text-brand-600 mb-3">App Download</p>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                  Get the Kerala Ayurvedh app for faster access
                </h2>
                <p className="text-slate-600 max-w-2xl mb-8">
                  Download the Android app to explore products, receive wellness guidance, place orders quickly, and stay connected with our latest Ayurvedic offerings.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href={apkDownloadUrl} download="kerala-ayurvedh.apk" className="inline-flex items-center justify-center rounded-full bg-brand-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-500 transition-colors">
                    Download Android App
                  </a>
                  <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-4 text-sm font-semibold text-slate-500">
                    iOS coming later
                  </span>
                </div>

                {/* 30-Second Sideload Installation Guide */}
                <div className="mt-12 pt-8 border-t border-slate-200 transition-colors duration-300">
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400 mb-6">
                    Quick 3-step Installation Guide
                  </h4>
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors duration-300">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-1 transition-colors duration-300">1. Download</p>
                        <p className="text-xs text-slate-500 leading-relaxed transition-colors duration-300">
                          Tap download and select <strong>"Download anyway"</strong> on Chrome's safe warning.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors duration-300">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-1 transition-colors duration-300">2. Allow Source</p>
                        <p className="text-xs text-slate-500 leading-relaxed transition-colors duration-300">
                          If prompted on install, tap <strong>"Settings"</strong> and toggle <strong>"Allow from this source"</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors duration-300">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 mb-1 transition-colors duration-300">3. Install & Open</p>
                        <p className="text-xs text-slate-500 leading-relaxed transition-colors duration-300">
                          Tap <strong>"Install"</strong>, wait a moment, and safely open your secure wellness app!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </AnimateOnScroll>
            </div>
            <AnimateOnScroll className="relative min-h-[360px] rounded-[2rem] overflow-hidden border border-slate-200 shadow-xl bg-white">
              <Image
                src="/app-download.jpeg"
                alt="Download app illustration"
                fill
                sizes="(min-width: 1024px) 460px, 100vw"
                className="object-cover"
              />
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
            <div>
              <AnimateOnScroll>
                <p className="text-sm uppercase font-semibold tracking-[0.4em] text-brand-600 mb-2">
                  Customer Reviews
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Trusted by 10 Lakh Customers
                </h2>
              </AnimateOnScroll>
            </div>
            <AnimateOnScroll className="text-sm text-slate-500 max-w-xl">
              Real feedback from customers who used our Ayurvedh product bundles for digestion, weight support and daily wellness.
            </AnimateOnScroll>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <AnimateOnScroll delay={0.05} className="group">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 group-hover:shadow-2xl">
                <div className="mb-6 text-brand-600 text-4xl leading-none">&ldquo;</div>
                <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                  I ordered the kerala weight loss powder it worked really well in with in 2 months i have lost 5kgs and my gut health is also really good. i recommend all to use who are serious on weight loss
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Satyaraj</p>
                    <p className="text-xs uppercase text-slate-500">Coimbatore</p>
                  </div>
                  <div className="flex gap-1 text-brand-500">
                    {[...Array(4)].map((_, idx) => (
                      <Star key={idx} fill="currentColor" className="w-4 h-4" />
                    ))}
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.1} className="group">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 group-hover:shadow-2xl">
                <div className="mb-6 text-brand-600 text-4xl leading-none">&ldquo;</div>
                <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                  skin allergy cream is really fantastic. i faced ringgards allergies from last few months and i used some products but they didnt work and one of my frnd suggested me this product it worked well.  
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">DURGA</p>
                    <p className="text-xs uppercase text-slate-500">Hyderabad</p>
                  </div>
                  <div className="flex gap-1 text-brand-500">
                    {[...Array(4)].map((_, idx) => (
                      <Star key={`full-4-${idx}`} fill="currentColor" className="w-4 h-4" />
                    ))}
                    <StarHalf fill="currentColor" className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={0.15} className="group">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2 group-hover:shadow-2xl">
                <div className="mb-6 text-brand-600 text-4xl leading-none">&ldquo;</div>
                <p className="text-sm text-slate-700 mb-6 leading-relaxed">
                  I loved the personal care from the team. The wellness bundle has helped my family feel calmer and more energetic, and the delivery was smooth too.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">zain</p>
                    <p className="text-xs uppercase text-slate-500">Kochi</p>
                  </div>
                  <div className="flex gap-1 text-brand-500">
                    {[...Array(3)].map((_, idx) => (
                      <Star key={`full-3-${idx}`} fill="currentColor" className="w-4 h-4" />
                    ))}
                    <StarHalf fill="currentColor" className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </section>

      {/* Footer: support email */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-600">
          For support: <a href="mailto:support@keralaayurvedh.com" className="text-brand-600 hover:underline">support@keralaayurvedh.com</a>
        </div>
      </footer>

      {/* Floating Action Button Placeholder */}
      <div className="fixed bottom-6 right-6 w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:bg-brand-500 transition-colors z-50">
        <ArrowUp className="w-6 h-6 text-white" />
      </div>

    </div>
  );
}
