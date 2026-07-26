import React, { useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';

type SectionKey = 'how' | 'services' | 'community' | 'business';

const NAV_ITEMS: { key: SectionKey; label: string }[] = [
  { key: 'how', label: 'How it works' },
  { key: 'services', label: 'Services' },
  { key: 'community', label: 'Community' },
  { key: 'business', label: 'For business' },
];

const TRUST_ITEMS = [
  { icon: 'person-circle-outline', label: 'Clear provider profiles' },
  { icon: 'chatbubbles-outline', label: 'Offers and messages in one place' },
  { icon: 'star-outline', label: 'Reviews linked to completed work' },
  { icon: 'location-outline', label: 'Built around local communities' },
];

const CATEGORIES = [
  { icon: 'flash-outline', label: 'Electrical & power', tone: '#FFF5E8' },
  { icon: 'water-outline', label: 'Plumbing & water', tone: '#EAF5FB' },
  { icon: 'construct-outline', label: 'Repairs & maintenance', tone: '#EDF4F0' },
  { icon: 'briefcase-outline', label: 'Business support', tone: '#EEF3FA' },
  { icon: 'school-outline', label: 'Tutoring & learning', tone: '#F4F0FB' },
  { icon: 'calendar-outline', label: 'Events & creative', tone: '#FFF0EC' },
  { icon: 'car-outline', label: 'Transport & logistics', tone: '#EEF7F5' },
  { icon: 'people-outline', label: 'Consulting & collaboration', tone: '#F5F1E9' },
];

const HOW_STEPS = [
  {
    number: '01',
    icon: 'create-outline',
    title: 'Tell us what you need',
    text: 'Describe the outcome, location, timing, and budget in plain language.',
  },
  {
    number: '02',
    icon: 'git-compare-outline',
    title: 'Review suitable offers',
    text: 'Compare profiles, experience, proposed pricing, and availability.',
  },
  {
    number: '03',
    icon: 'checkmark-done-outline',
    title: 'Connect and get it done',
    text: 'Keep the conversation, job progress, and review connected to the request.',
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sectionOffsets, setSectionOffsets] = useState<Partial<Record<SectionKey, number>>>({});
  const isDesktop = width >= 900;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const rememberSection = (key: SectionKey) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setSectionOffsets((current) => (current[key] === y ? current : { ...current, [key]: y }));
  };

  const scrollToSection = (key: SectionKey) => {
    const y = sectionOffsets[key];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 68), animated: true });
    }
    setMobileMenuOpen(false);
  };

  const goToRegister = (role: 'need_help' | 'helper' = 'need_help') => {
    router.push(`/(auth)/register?role=${role}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerShell}>
          <View style={[styles.header, isDesktop && styles.maxWidth]}>
            <TouchableOpacity
              style={styles.brand}
              onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
              accessibilityRole="button"
              accessibilityLabel="SolveConnect, return to top"
              activeOpacity={0.8}
            >
              <Image
                source={require('../assets/images/icon.png')}
                style={styles.brandLogo}
                resizeMode="cover"
                accessibilityLabel="SolveConnect logo"
              />
              <Text style={styles.brandName}>SolveConnect</Text>
            </TouchableOpacity>

            {isDesktop ? (
              <>
                <View style={styles.desktopNav} accessibilityRole="menu">
                  {NAV_ITEMS.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.navButton}
                      onPress={() => scrollToSection(item.key)}
                      accessibilityRole="menuitem"
                    >
                      <Text style={styles.navButtonText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => router.push('/(auth)/login')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.loginButtonText}>Log in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerCta}
                    onPress={() => goToRegister()}
                    accessibilityRole="button"
                  >
                    <Text style={styles.headerCtaText}>Get started</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setMobileMenuOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                accessibilityState={{ expanded: mobileMenuOpen }}
              >
                <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={25} color="#10231C" />
              </TouchableOpacity>
            )}
          </View>
          {!isDesktop && mobileMenuOpen && (
            <View style={styles.mobileMenu}>
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.mobileMenuItem}
                  onPress={() => scrollToSection(item.key)}
                  accessibilityRole="button"
                >
                  <Text style={styles.mobileMenuText}>{item.label}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#5D6B64" />
                </TouchableOpacity>
              ))}
              <View style={styles.mobileMenuActions}>
                <TouchableOpacity style={styles.mobileLogin} onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.mobileLoginText}>Log in</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileCta} onPress={() => goToRegister()}>
                  <Text style={styles.mobileCtaText}>Get started</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroInner, isDesktop && styles.maxWidth, isDesktop && styles.heroDesktop]}>
            <View style={[styles.heroCopy, isDesktop && styles.heroCopyDesktop]}>
              <View style={styles.locationEyebrow}>
                <Ionicons name="location" size={15} color="#A8E3CD" />
                <Text style={styles.locationEyebrowText}>Ready for Nigeria.</Text>
              </View>
              <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]} accessibilityRole="header">
                Find the right people to solve problems faster.
              </Text>
              <Text style={[styles.heroText, isDesktop && styles.heroTextDesktop]}>
                SolveConnect brings individuals, businesses, professionals, and communities together to request help, offer skills, and move opportunities forward online and offline.
              </Text>
              <View style={[styles.heroActions, !isDesktop && styles.heroActionsMobile]}>
                <TouchableOpacity
                  style={styles.heroPrimary}
                  onPress={() => goToRegister('need_help')}
                  accessibilityRole="button"
                  accessibilityLabel="Request help on SolveConnect"
                >
                  <Ionicons name="add-circle-outline" size={20} color="#10231C" />
                  <Text style={styles.heroPrimaryText}>Request help</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroSecondary}
                  onPress={() => goToRegister('helper')}
                  accessibilityRole="button"
                  accessibilityLabel="Offer your skills on SolveConnect"
                >
                  <Ionicons name="briefcase-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.heroSecondaryText}>Offer a solution</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.heroMicrocopy}>Free to join. Choose the role that fits what you need today.</Text>
            </View>

            <View style={[styles.marketplaceScene, isDesktop && styles.marketplaceSceneDesktop]} accessibilityLabel="Example SolveConnect request and offer flow">
              <View style={styles.sceneSearch}>
                <Ionicons name="search" size={18} color="#5D6B64" />
                <Text style={styles.sceneSearchText}>What do you need help with?</Text>
              </View>
              <View style={styles.requestPreview}>
                <View style={styles.requestPreviewTop}>
                  <View style={styles.requestIcon}>
                    <Ionicons name="flash" size={20} color="#0B6B4F" />
                  </View>
                  <View style={styles.requestCopy}>
                    <Text style={styles.requestLabel}>NEW REQUEST</Text>
                    <Text style={styles.requestTitle}>Electrical repair at home</Text>
                  </View>
                  <View style={styles.openBadge}>
                    <Text style={styles.openBadgeText}>Open</Text>
                  </View>
                </View>
                <View style={styles.requestMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color="#5D6B64" />
                    <Text style={styles.metaText}>Bodija, Ibadan</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#5D6B64" />
                    <Text style={styles.metaText}>Today</Text>
                  </View>
                </View>
              </View>
              <View style={styles.offerPreview}>
                <View style={styles.offerHeadingRow}>
                  <Text style={styles.offerHeading}>Compare suitable responses</Text>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#0B6B4F" />
                </View>
                <View style={styles.offerRow}>
                  <View style={[styles.providerAvatar, { backgroundColor: '#EAF5FB' }]}>
                    <Ionicons name="person" size={18} color="#1769AA" />
                  </View>
                  <View style={styles.offerCopy}>
                    <Text style={styles.offerTitle}>Local professional</Text>
                    <Text style={styles.offerText}>Profile, work history, quote</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8A9991" />
                </View>
                <View style={styles.offerDivider} />
                <View style={styles.offerRow}>
                  <View style={[styles.providerAvatar, { backgroundColor: '#FFF0EC' }]}>
                    <Ionicons name="business" size={18} color="#B5471B" />
                  </View>
                  <View style={styles.offerCopy}>
                    <Text style={styles.offerTitle}>Service business</Text>
                    <Text style={styles.offerText}>Availability, pricing, reviews</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#8A9991" />
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.trustBand}>
          <View style={[styles.trustGrid, isDesktop && styles.maxWidth]}>
            {TRUST_ITEMS.map((item) => (
              <View key={item.label} style={styles.trustItem}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={21} color="#0B6B4F" />
                <Text style={styles.trustText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} onLayout={rememberSection('how')} nativeID="how-it-works">
          <View style={[styles.sectionInner, isDesktop && styles.maxWidth]}>
            <View style={styles.sectionIntro}>
              <Text style={styles.eyebrow}>HOW IT WORKS</Text>
              <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]} accessibilityRole="header">
                A clearer path from problem to progress
              </Text>
              <Text style={styles.sectionLead}>
                Start with the outcome you need. SolveConnect keeps discovery, offers, conversation, and follow-through connected.
              </Text>
            </View>
            <View style={[styles.stepsGrid, !isDesktop && styles.stack]}>
              {HOW_STEPS.map((step) => (
                <View key={step.number} style={styles.stepCard}>
                  <View style={styles.stepTopRow}>
                    <View style={styles.stepIcon}>
                      <Ionicons name={step.icon as keyof typeof Ionicons.glyphMap} size={23} color="#0B6B4F" />
                    </View>
                    <Text style={styles.stepNumber}>{step.number}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.section, styles.servicesSection]} onLayout={rememberSection('services')} nativeID="services">
          <View style={[styles.sectionInner, isDesktop && styles.maxWidth]}>
            <View style={[styles.sectionHeadingRow, !isDesktop && styles.sectionHeadingStack]}>
              <View style={styles.sectionIntroCompact}>
                <Text style={styles.eyebrow}>EXPLORE SERVICES</Text>
                <Text style={styles.sectionTitle} accessibilityRole="header">Everyday skills and specialist support</Text>
              </View>
              <TouchableOpacity style={styles.textAction} onPress={() => goToRegister('need_help')}>
                <Text style={styles.textActionText}>Explore after signup</Text>
                <Ionicons name="arrow-forward" size={18} color="#0B6B4F" />
              </TouchableOpacity>
            </View>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.label}
                  style={[styles.categoryCard, isDesktop ? styles.categoryDesktop : styles.categoryMobile]}
                  onPress={() => goToRegister('need_help')}
                  accessibilityRole="button"
                  accessibilityLabel={`Find ${category.label}`}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: category.tone }]}>
                    <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={23} color="#10231C" />
                  </View>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Ionicons name="arrow-forward" size={17} color="#8A9991" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.audienceBand}>
          <View style={[styles.sectionInner, isDesktop && styles.maxWidth]}>
            <View style={styles.sectionIntro}>
              <Text style={[styles.eyebrow, styles.eyebrowOnDark]}>ONE NETWORK, TWO CLEAR STARTING POINTS</Text>
              <Text style={[styles.sectionTitle, styles.titleOnDark]} accessibilityRole="header">
                Get support or turn your skills into opportunity
              </Text>
            </View>
            <View style={[styles.audienceGrid, !isDesktop && styles.stack]}>
              <View style={styles.audiencePanel}>
                <View style={styles.audienceIcon}>
                  <Ionicons name="help-buoy-outline" size={25} color="#10231C" />
                </View>
                <Text style={styles.audienceLabel}>FOR PEOPLE AND ORGANIZATIONS</Text>
                <Text style={styles.audienceTitle}>Ask for the help you actually need</Text>
                <Text style={styles.audienceText}>Post household, professional, project, event, or business needs and review responses without chasing referrals across multiple channels.</Text>
                <TouchableOpacity style={styles.audienceAction} onPress={() => goToRegister('need_help')}>
                  <Text style={styles.audienceActionText}>Request help</Text>
                  <Ionicons name="arrow-forward" size={18} color="#10231C" />
                </TouchableOpacity>
              </View>
              <View style={styles.audiencePanel}>
                <View style={styles.audienceIcon}>
                  <Ionicons name="trending-up-outline" size={25} color="#10231C" />
                </View>
                <Text style={styles.audienceLabel}>FOR PROFESSIONALS AND BUSINESSES</Text>
                <Text style={styles.audienceTitle}>Build a visible, credible service presence</Text>
                <Text style={styles.audienceText}>Find relevant requests, respond with a clear offer, keep client conversations organized, and build a work history over time.</Text>
                <TouchableOpacity style={styles.audienceAction} onPress={() => goToRegister('helper')}>
                  <Text style={styles.audienceActionText}>Become a provider</Text>
                  <Ionicons name="arrow-forward" size={18} color="#10231C" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section} onLayout={rememberSection('community')} nativeID="community">
          <View style={[styles.sectionInner, isDesktop && styles.maxWidth, isDesktop && styles.communityLayout]}>
            <View style={styles.communityCopy}>
              <Text style={styles.eyebrow}>COMMUNITY, ONLINE AND OFFLINE</Text>
              <Text style={[styles.sectionTitle, isDesktop && styles.sectionTitleDesktop]} accessibilityRole="header">
                Useful connections should extend beyond a transaction
              </Text>
              <Text style={styles.sectionLead}>
                Join local and interest-based communities for recommendations, collaboration, learning, and practical support. Events and workshops will make those relationships easier to build in person.
              </Text>
              <TouchableOpacity style={styles.outlineAction} onPress={() => goToRegister()}>
                <Ionicons name="people-outline" size={19} color="#0B6B4F" />
                <Text style={styles.outlineActionText}>Join the community</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.communityFeatures}>
              <View style={styles.communityFeature}>
                <Ionicons name="location-outline" size={23} color="#1769AA" />
                <View style={styles.communityFeatureCopy}>
                  <Text style={styles.communityFeatureTitle}>Local chapters</Text>
                  <Text style={styles.communityFeatureText}>Discover people and useful conversations around your city or industry.</Text>
                </View>
              </View>
              <View style={styles.featureDivider} />
              <View style={styles.communityFeature}>
                <Ionicons name="calendar-outline" size={23} color="#B5471B" />
                <View style={styles.communityFeatureCopy}>
                  <View style={styles.comingSoonRow}>
                    <Text style={styles.communityFeatureTitle}>Events and workshops</Text>
                    <View style={styles.comingSoonBadge}><Text style={styles.comingSoonText}>Coming soon</Text></View>
                  </View>
                  <Text style={styles.communityFeatureText}>Practical sessions, networking, and community-led problem solving.</Text>
                </View>
              </View>
              <View style={styles.featureDivider} />
              <View style={styles.communityFeature}>
                <Ionicons name="bulb-outline" size={23} color="#0B6B4F" />
                <View style={styles.communityFeatureCopy}>
                  <Text style={styles.communityFeatureTitle}>Shared knowledge</Text>
                  <Text style={styles.communityFeatureText}>Learn from trusted recommendations and the experience of other members.</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.businessBand} onLayout={rememberSection('business')} nativeID="business-solutions">
          <View style={[styles.businessInner, isDesktop && styles.maxWidth, !isDesktop && styles.businessStack]}>
            <View style={styles.businessCopy}>
              <Text style={[styles.eyebrow, styles.eyebrowOnDark]}>BUSINESS SOLUTIONS</Text>
              <Text style={[styles.businessTitle, isDesktop && styles.businessTitleDesktop]} accessibilityRole="header">
                A practical support network for teams and local institutions
              </Text>
              <Text style={styles.businessText}>
                Source service providers, find specialist input, coordinate community initiatives, or discuss a tailored partnership for your organization.
              </Text>
            </View>
            <View style={styles.businessActions}>
              <TouchableOpacity style={styles.businessPrimary} onPress={() => goToRegister()}>
                <Text style={styles.businessPrimaryText}>Create an organization account</Text>
                <Ionicons name="arrow-forward" size={18} color="#10231C" />
              </TouchableOpacity>
              <Text style={styles.businessMicrocopy}>Partnership and membership options are being prepared.</Text>
            </View>
          </View>
        </View>

        <View style={styles.finalCta}>
          <View style={[styles.finalCtaInner, isDesktop && styles.maxWidth]}>
            <View style={styles.finalCtaIcon}>
              <Ionicons name="link-outline" size={26} color="#0B6B4F" />
            </View>
            <Text style={[styles.finalCtaTitle, isDesktop && styles.finalCtaTitleDesktop]} accessibilityRole="header">
              Your next useful connection can start here.
            </Text>
            <Text style={styles.finalCtaText}>Join free, explain what you need or what you can offer, and take the next clear step.</Text>
            <View style={[styles.finalActions, !isDesktop && styles.heroActionsMobile]}>
              <TouchableOpacity style={styles.finalPrimary} onPress={() => goToRegister()}>
                <Text style={styles.finalPrimaryText}>Get started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.finalSecondary} onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.finalSecondaryText}>I already have an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={[styles.footerInner, isDesktop && styles.maxWidth]}>
            <View style={styles.footerBrandBlock}>
              <View style={styles.footerBrand}>
                <View style={styles.footerLogoWrap}>
                  <Image source={require('../assets/images/icon.png')} style={styles.footerLogo} resizeMode="cover" />
                </View>
                <Text style={styles.footerBrandName}>SolveConnect</Text>
              </View>
              <Text style={styles.footerText}>People, skills, services, and opportunities connected around real needs.</Text>
              <View style={styles.footerLocation}>
                <Ionicons name="location-outline" size={16} color="#A8B7B0" />
                <Text style={styles.footerLocationText}>Ibadan, Nigeria</Text>
              </View>
            </View>
            <View style={styles.footerLinks}>
              {NAV_ITEMS.map((item) => (
                <TouchableOpacity key={item.key} onPress={() => scrollToSection(item.key)}>
                  <Text style={styles.footerLink}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.footerBottom}>
              <Text style={styles.footerCopyright}>© {new Date().getFullYear()} SolveConnect. All rights reserved.</Text>
              <Text style={styles.footerNote}>Designed for clear, respectful local collaboration.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  page: { flex: 1, backgroundColor: '#F5F8F6' },
  pageContent: { backgroundColor: '#F5F8F6' },
  maxWidth: { width: '100%', maxWidth: 1180, alignSelf: 'center' },
  headerShell: {
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderBottomWidth: 1,
    borderBottomColor: '#D7E2DC',
  },
  header: { minHeight: 68, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 38, height: 38, borderRadius: 8 },
  brandName: { fontSize: 20, fontWeight: '700', color: '#10231C' },
  desktopNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  navButtonText: { fontSize: 14, fontWeight: '600', color: '#4E5E56' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 },
  loginButtonText: { fontSize: 14, fontWeight: '700', color: '#0B6B4F' },
  headerCta: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, backgroundColor: '#0B6B4F', borderRadius: 8 },
  headerCtaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#D7E2DC' },
  mobileMenu: { paddingHorizontal: 18, paddingBottom: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EDF4F0' },
  mobileMenuItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EDF4F0' },
  mobileMenuText: { fontSize: 15, fontWeight: '600', color: '#10231C' },
  mobileMenuActions: { flexDirection: 'row', gap: 10, paddingTop: 14 },
  mobileLogin: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#C8D6CF' },
  mobileLoginText: { fontSize: 15, fontWeight: '700', color: '#0B6B4F' },
  mobileCta: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#0B6B4F' },
  mobileCtaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  hero: { backgroundColor: '#063C2E', overflow: 'hidden' },
  heroInner: { minHeight: 500, paddingHorizontal: 20, paddingVertical: 36, justifyContent: 'center', gap: 28 },
  heroDesktop: { minHeight: 570, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56, gap: 64 },
  heroCopy: { zIndex: 2 },
  heroCopyDesktop: { flex: 1.05, maxWidth: 650 },
  locationEyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 18 },
  locationEyebrowText: { color: '#A8E3CD', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  heroTitle: { color: '#FFFFFF', fontSize: 38, lineHeight: 44, fontWeight: '700', marginBottom: 16 },
  heroTitleDesktop: { fontSize: 52, lineHeight: 60 },
  heroText: { color: '#DCEAE4', fontSize: 16, lineHeight: 24, maxWidth: 620 },
  heroTextDesktop: { fontSize: 18, lineHeight: 28 },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  heroActionsMobile: { flexDirection: 'column' },
  heroPrimary: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#F6B44B' },
  heroPrimaryText: { fontSize: 16, fontWeight: '700', color: '#10231C' },
  heroSecondary: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#6AA28F' },
  heroSecondaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  heroMicrocopy: { marginTop: 12, fontSize: 12, lineHeight: 17, color: '#A8C2B8' },
  marketplaceScene: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, gap: 10, shadowColor: '#001A12', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
  marketplaceSceneDesktop: { flex: 0.82, maxWidth: 430, minWidth: 390, transform: [{ rotate: '1deg' }] },
  sceneSearch: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F5F8F6', borderWidth: 1, borderColor: '#D7E2DC' },
  sceneSearchText: { fontSize: 13, color: '#5D6B64' },
  requestPreview: { padding: 13, borderRadius: 8, borderWidth: 1, borderColor: '#D7E2DC' },
  requestPreviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#EDF4F0' },
  requestCopy: { flex: 1 },
  requestLabel: { fontSize: 10, lineHeight: 14, fontWeight: '700', color: '#0B6B4F' },
  requestTitle: { marginTop: 2, fontSize: 14, lineHeight: 19, fontWeight: '700', color: '#10231C' },
  openBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E5F4EC' },
  openBadgeText: { fontSize: 10, fontWeight: '700', color: '#0B6B4F' },
  requestMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EDF4F0' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#5D6B64' },
  offerPreview: { padding: 13, borderRadius: 8, backgroundColor: '#F8FAF9' },
  offerHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  offerHeading: { fontSize: 12, fontWeight: '700', color: '#10231C' },
  offerRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9 },
  providerAvatar: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  offerCopy: { flex: 1 },
  offerTitle: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#10231C' },
  offerText: { fontSize: 10, lineHeight: 14, color: '#5D6B64' },
  offerDivider: { height: 1, backgroundColor: '#E5ECE8', marginVertical: 5 },
  trustBand: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D7E2DC' },
  trustGrid: { paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  trustItem: { minWidth: 210, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  trustText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600', color: '#44534C' },
  section: { backgroundColor: '#FFFFFF' },
  servicesSection: { backgroundColor: '#F5F8F6' },
  sectionInner: { paddingHorizontal: 20, paddingVertical: 64 },
  sectionIntro: { maxWidth: 700, marginBottom: 30 },
  sectionIntroCompact: { maxWidth: 620 },
  eyebrow: { marginBottom: 10, fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#0B6B4F' },
  eyebrowOnDark: { color: '#A8E3CD' },
  sectionTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: '#10231C' },
  sectionTitleDesktop: { fontSize: 36, lineHeight: 44 },
  sectionLead: { marginTop: 14, maxWidth: 680, fontSize: 16, lineHeight: 24, color: '#5D6B64' },
  stepsGrid: { flexDirection: 'row', gap: 16 },
  stack: { flexDirection: 'column' },
  stepCard: { flex: 1, minHeight: 210, padding: 20, borderRadius: 8, borderWidth: 1, borderColor: '#D7E2DC', backgroundColor: '#FFFFFF' },
  stepTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  stepIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#EDF4F0' },
  stepNumber: { fontSize: 13, fontWeight: '700', color: '#8A9991' },
  stepTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: '#10231C', marginBottom: 9 },
  stepText: { fontSize: 14, lineHeight: 21, color: '#5D6B64' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28 },
  sectionHeadingStack: { flexDirection: 'column', alignItems: 'flex-start' },
  textAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  textActionText: { fontSize: 14, fontWeight: '700', color: '#0B6B4F' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D7E2DC', backgroundColor: '#FFFFFF' },
  categoryDesktop: { width: '24%' },
  categoryMobile: { width: '100%' },
  categoryIcon: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: '#10231C' },
  audienceBand: { backgroundColor: '#0A2E25' },
  titleOnDark: { color: '#FFFFFF' },
  audienceGrid: { flexDirection: 'row', gap: 16 },
  audiencePanel: { flex: 1, padding: 24, borderRadius: 8, backgroundColor: '#FFFFFF' },
  audienceIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F6B44B', marginBottom: 20 },
  audienceLabel: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: '#0B6B4F', marginBottom: 8 },
  audienceTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: '#10231C', marginBottom: 10 },
  audienceText: { fontSize: 14, lineHeight: 22, color: '#5D6B64' },
  audienceAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  audienceActionText: { fontSize: 14, fontWeight: '700', color: '#10231C' },
  communityLayout: { flexDirection: 'row', alignItems: 'center', gap: 64 },
  communityCopy: { flex: 1 },
  outlineAction: { alignSelf: 'flex-start', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#9DB9AC' },
  outlineActionText: { fontSize: 14, fontWeight: '700', color: '#0B6B4F' },
  communityFeatures: { flex: 1, marginTop: 28, padding: 20, borderRadius: 8, backgroundColor: '#F5F8F6', borderWidth: 1, borderColor: '#D7E2DC' },
  communityFeature: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  communityFeatureCopy: { flex: 1 },
  communityFeatureTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: '#10231C' },
  communityFeatureText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: '#5D6B64' },
  featureDivider: { height: 1, backgroundColor: '#D7E2DC', marginVertical: 18 },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  comingSoonBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FFF0E4' },
  comingSoonText: { fontSize: 10, fontWeight: '700', color: '#9A4F14' },
  businessBand: { backgroundColor: '#102A3A' },
  businessInner: { minHeight: 330, paddingHorizontal: 20, paddingVertical: 64, flexDirection: 'row', alignItems: 'center', gap: 56 },
  businessStack: { flexDirection: 'column', alignItems: 'stretch' },
  businessCopy: { flex: 1.2 },
  businessTitle: { fontSize: 28, lineHeight: 35, fontWeight: '700', color: '#FFFFFF' },
  businessTitleDesktop: { fontSize: 38, lineHeight: 46 },
  businessText: { marginTop: 14, maxWidth: 650, fontSize: 16, lineHeight: 24, color: '#C6D5DD' },
  businessActions: { flex: 0.8, alignItems: 'stretch', gap: 12 },
  businessPrimary: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18, borderRadius: 8, backgroundColor: '#F6B44B' },
  businessPrimaryText: { fontSize: 14, fontWeight: '700', color: '#10231C' },
  businessMicrocopy: { fontSize: 12, lineHeight: 17, textAlign: 'center', color: '#9FB4BF' },
  finalCta: { backgroundColor: '#E8F3EE' },
  finalCtaInner: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 64 },
  finalCtaIcon: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#FFFFFF', marginBottom: 18 },
  finalCtaTitle: { maxWidth: 700, textAlign: 'center', fontSize: 28, lineHeight: 35, fontWeight: '700', color: '#10231C' },
  finalCtaTitleDesktop: { fontSize: 40, lineHeight: 48 },
  finalCtaText: { maxWidth: 620, marginTop: 12, textAlign: 'center', fontSize: 16, lineHeight: 24, color: '#5D6B64' },
  finalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  finalPrimary: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#0B6B4F' },
  finalPrimaryText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  finalSecondary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#9DB9AC' },
  finalSecondaryText: { fontSize: 15, fontWeight: '700', color: '#0B6B4F' },
  footer: { backgroundColor: '#091D17' },
  footerInner: { paddingHorizontal: 20, paddingTop: 48, paddingBottom: Platform.OS === 'web' ? 28 : 48 },
  footerBrandBlock: { maxWidth: 470 },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLogoWrap: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  footerLogo: { width: 40, height: 40 },
  footerBrandName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  footerText: { marginTop: 15, fontSize: 14, lineHeight: 21, color: '#A8B7B0' },
  footerLocation: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerLocationText: { fontSize: 13, color: '#A8B7B0' },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 32, paddingVertical: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1C3A31' },
  footerLink: { fontSize: 13, fontWeight: '600', color: '#D8E3DE' },
  footerBottom: { paddingTop: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  footerCopyright: { fontSize: 12, color: '#809189' },
  footerNote: { fontSize: 12, color: '#809189' },
});
