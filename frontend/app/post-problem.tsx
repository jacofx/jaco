import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { AppButton, FormField, ScreenHeader, StatusBadge } from '../components/ui';
import { SERVICE_CATEGORIES, colors, radius, shadows, spacing, typography } from '../constants';
import { adsAPI, aiAPI, jobAPI } from '../services/api';
import { getApiErrorMessage } from '../services/error';
import { useAuthStore } from '../store/authStore';

type RequestStep = 'details' | 'review';

type RequestLocation = {
  lat: number;
  lng: number;
  address: string;
};

type PromotionPackage = {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  priority_level: number;
  featured: boolean;
  urgent: boolean;
};

const FREE_PACKAGE: PromotionPackage = {
  id: 'free',
  name: 'Free listing',
  price: 0,
  currency: 'NGN',
  duration_days: 0,
  priority_level: 0,
  featured: false,
  urgent: false,
};

export default function PostProblemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<RequestStep>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState(params.category || '');
  const [addressInput, setAddressInput] = useState(user?.location?.address || '');
  const [requestLocation, setRequestLocation] = useState<RequestLocation | null>(() => {
    const lat = Number(user?.location?.lat);
    const lng = Number(user?.location?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && user?.location?.address
      ? { lat, lng, address: user.location.address }
      : null;
  });
  const [packages, setPackages] = useState<PromotionPackage[]>([FREE_PACKAGE]);
  const [selectedPackageId, setSelectedPackageId] = useState('free');
  const [showPromotions, setShowPromotions] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const isWide = width >= 720;

  useEffect(() => {
    if (params.category && SERVICE_CATEGORIES.some((item) => item.id === params.category)) {
      setCategory(params.category);
    }
  }, [params.category]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  useEffect(() => {
    let mounted = true;
    const loadPackages = async () => {
      try {
        const response = await adsAPI.getPackages();
        const serverPackages = Array.isArray(response.data?.packages) ? response.data.packages : [];
        if (mounted && serverPackages.length) {
          setPackages(serverPackages.map((item: any) => ({
            id: String(item.id),
            name: String(item.name || item.label || formatLabel(String(item.id))),
            price: Number(item.price ?? item.amount ?? 0),
            currency: String(item.currency || 'NGN'),
            duration_days: Number(item.duration_days || 0),
            priority_level: Number(item.priority_level || 0),
            featured: Boolean(item.featured),
            urgent: Boolean(item.urgent),
          })));
        }
      } catch {
        if (mounted) setPromotionNotice('Paid visibility options are unavailable right now. You can still publish for free.');
      } finally {
        if (mounted) setLoadingPackages(false);
      }
    };
    void loadPackages();
    return () => {
      mounted = false;
    };
  }, []);

  const activePackage = useMemo(
    () => packages.find((item) => item.id === selectedPackageId) || FREE_PACKAGE,
    [packages, selectedPackageId],
  );
  const selectedCategory = SERVICE_CATEGORIES.find((item) => item.id === category);

  const validateDetails = () => {
    const numericBudget = Number(budget);
    if (title.trim().length < 5) return 'Use a short, specific title with at least 5 characters.';
    if (description.trim().length < 20) return 'Add a little more detail so providers can understand the scope.';
    if (!category) return 'Choose the service category that best fits the request.';
    if (!Number.isFinite(numericBudget) || numericBudget <= 0) return 'Enter a working budget greater than zero.';
    return null;
  };

  const continueToReview = () => {
    const error = validateDetails();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setStep('review');
  };

  const handleBack = () => {
    if (step === 'review') {
      setFormError(null);
      setStep('details');
      return;
    }
    router.back();
  };

  const applyLocation = (nextLocation: RequestLocation, message: string) => {
    setRequestLocation(nextLocation);
    setAddressInput(nextLocation.address);
    setLocationNotice(message);
    setFormError(null);
  };

  const handleCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    setLocationNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationNotice('Location permission was not granted. Enter the service address instead.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const addresses = await Location.reverseGeocodeAsync(result.coords);
      const first = addresses[0];
      const address = first
        ? [first.name || first.street, first.district, first.city, first.region].filter(Boolean).join(', ')
        : 'Current location';
      applyLocation({ lat: result.coords.latitude, lng: result.coords.longitude, address }, 'Current location added to this request.');
    } catch {
      setLocationNotice('We could not read your current location. Enter the service address instead.');
    } finally {
      setLocating(false);
    }
  };

  const handleAddressLookup = async () => {
    const address = addressInput.trim();
    if (address.length < 5) {
      setFormError('Enter a complete service address before looking it up.');
      return;
    }
    setLocating(true);
    setLocationNotice(null);
    setFormError(null);
    try {
      const matches = await Location.geocodeAsync(address);
      const first = matches[0];
      if (!first) {
        setFormError('We could not locate that address. Add an area and city, then try again.');
        return;
      }
      applyLocation({ lat: first.latitude, lng: first.longitude, address }, 'Service address confirmed for this request.');
    } catch {
      setFormError('Address lookup is unavailable. Try using your current location or check the address.');
    } finally {
      setLocating(false);
    }
  };

  const handlePublish = async () => {
    const detailsError = validateDetails();
    if (detailsError) {
      setStep('details');
      setFormError(detailsError);
      return;
    }
    if (!requestLocation) {
      setFormError('Confirm a service address or use your current location before publishing.');
      return;
    }

    setPublishing(true);
    setFormError(null);
    let didCompletePayment = false;

    try {
      let paymentId: string | undefined;

      if (activePackage.id !== 'free') {
        const redirectUri = Linking.createURL('ads-payment');
        const checkoutResponse = await adsAPI.checkout(activePackage.id, redirectUri);
        paymentId = checkoutResponse.data?.payment?._id;
        const checkoutUrl = checkoutResponse.data?.checkout_url;
        const requiresRedirect = Boolean(checkoutResponse.data?.requires_redirect);

        if (!paymentId) throw new Error('Payment could not be prepared.');
        if (requiresRedirect) {
          if (!checkoutUrl) throw new Error('Secure checkout is unavailable.');
          const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectUri);
          if (result.type !== 'success' || !result.url) throw new Error('Checkout was cancelled. Your request was not published.');
          const parsed = Linking.parse(result.url);
          const status = firstQueryValue(parsed.queryParams?.status);
          const sessionId = firstQueryValue(parsed.queryParams?.session_id);
          if (status !== 'success' || !sessionId) throw new Error('Payment was not completed. Your request was not published.');
          await adsAPI.verify(paymentId, sessionId);
        }
        didCompletePayment = true;
      }

      let serverAnalysis: Record<string, unknown> | undefined;
      try {
        const analysisResponse = await aiAPI.analyzeProblem({
          title: title.trim(),
          description: description.trim(),
          budget: Number(budget),
          category,
          location: requestLocation,
        });
        serverAnalysis = analysisResponse.data;
      } catch {
        // Job creation performs server-side analysis when no preview result is available.
      }

      await jobAPI.createJob({
        title: title.trim(),
        description: description.trim(),
        budget: Number(budget),
        category,
        location: requestLocation,
        ad_package: activePackage.id,
        promotion: {
          id: activePackage.id,
          label: activePackage.name,
          price: formatPackagePrice(activePackage),
          duration_days: activePackage.duration_days,
          priority_level: activePackage.priority_level,
          featured: activePackage.featured,
          urgent: activePackage.urgent,
        },
        promotion_days: activePackage.duration_days,
        priority_level: activePackage.priority_level,
        is_featured: activePackage.featured,
        is_urgent: activePackage.urgent,
        payment_id: paymentId,
        ...(serverAnalysis ? { ai_analysis: serverAnalysis } : {}),
      });

      router.replace('/(tabs)/requests');
    } catch (error) {
      const message = getApiErrorMessage(error, 'We could not publish this request.');
      setFormError(didCompletePayment
        ? `Payment may have completed, but the request did not publish. Do not pay again. Check Payment History or contact support. ${message}`
        : message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.pageFrame}>
            <ScreenHeader
              eyebrow={`STEP ${step === 'details' ? '1' : '2'} OF 2`}
              title={step === 'details' ? 'What do you need help with?' : 'Review and publish'}
              subtitle={step === 'details' ? 'Share enough detail for the right providers to understand the outcome.' : 'Confirm the service location and choose how the request should appear.'}
              onBack={handleBack}
              backLabel={step === 'details' ? 'Close request form' : 'Return to request details'}
              style={styles.header}
            />

            <View style={styles.progressTrack} accessibilityLabel={`Step ${step === 'details' ? '1' : '2'} of 2`}>
              <View style={[styles.progressFill, step === 'review' && styles.progressFillComplete]} />
            </View>

            {formError ? (
              <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {step === 'details' ? (
              <View style={styles.formSection}>
                <FormField
                  label="Request title"
                  required
                  leftIcon="create-outline"
                  placeholder="e.g. Repair a leaking kitchen pipe"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={80}
                  helperText={`${title.length}/80 characters`}
                  returnKeyType="next"
                />
                <FormField
                  label="What needs to be done?"
                  required
                  leftIcon="document-text-outline"
                  placeholder="Include the problem, expected outcome, timing, and any useful context."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={1200}
                  helperText={`${description.length}/1200 characters. Do not include passwords or sensitive information.`}
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Service category <Text style={styles.required}>*</Text></Text>
                  <Text style={styles.fieldHelp}>Choose the closest match. Providers use this to find relevant requests.</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller} accessibilityRole="list">
                    {SERVICE_CATEGORIES.map((item) => {
                      const selected = item.id === category;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.categoryChip, selected && styles.categoryChipActive]}
                          onPress={() => setCategory(item.id)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                        >
                          <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={17} color={selected ? colors.inverse : colors.muted} />
                          <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{item.shortLabel}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {selectedCategory ? (
                    <View style={styles.categorySummary}>
                      <View style={styles.categorySummaryIcon}><Ionicons name={selectedCategory.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} /></View>
                      <View style={styles.categorySummaryCopy}>
                        <Text style={styles.categorySummaryTitle}>{selectedCategory.label}</Text>
                        <Text style={styles.categorySummaryText}>{selectedCategory.description}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <FormField
                  label="Working budget"
                  required
                  leftIcon="cash-outline"
                  placeholder="e.g. 15000"
                  value={budget}
                  onChangeText={(value) => setBudget(value.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  helperText="Enter an amount in Nigerian naira. Providers can still explain a different quote."
                  returnKeyType="done"
                />

                <View style={styles.formFooter}>
                  <AppButton label="Continue to review" icon="arrow-forward" iconPosition="right" fullWidth={!isWide} onPress={continueToReview} />
                  <Text style={styles.footerNote}>You can review everything before publishing.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.formSection}>
                <View style={styles.requestSummary}>
                  <View style={styles.summaryTopRow}>
                    <View style={styles.summaryIcon}><Ionicons name={selectedCategory?.icon as keyof typeof Ionicons.glyphMap || 'briefcase-outline'} size={22} color={colors.primary} /></View>
                    <View style={styles.summaryCopy}>
                      <Text style={styles.summaryEyebrow}>{selectedCategory?.label || 'Service request'}</Text>
                      <Text style={styles.summaryTitle}>{title}</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton} onPress={() => setStep('details')} accessibilityRole="button"><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity>
                  </View>
                  <Text style={styles.summaryDescription} numberOfLines={3}>{description}</Text>
                  <View style={styles.summaryBudgetRow}><Text style={styles.summaryBudgetLabel}>Working budget</Text><Text style={styles.summaryBudget}>₦{Number(budget).toLocaleString()}</Text></View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.sectionTitle}>Where is the service needed?</Text>
                  <Text style={styles.fieldHelp}>The address helps providers assess travel and availability. Exact coordinates are used only for matching and distance.</Text>
                  <FormField label="Service address" required leftIcon="location-outline" placeholder="Street or area, city, state" value={addressInput} onChangeText={(value) => { setAddressInput(value); setRequestLocation(null); setLocationNotice(null); }} />
                  <View style={[styles.locationActions, isWide && styles.locationActionsWide]}>
                    <AppButton label="Find this address" variant="outline" icon="search-outline" fullWidth={!isWide} loading={locating} onPress={handleAddressLookup} />
                    <AppButton label="Use current location" variant="ghost" icon="locate-outline" fullWidth={!isWide} disabled={locating} onPress={handleCurrentLocation} />
                  </View>
                  {requestLocation ? (
                    <View style={styles.locationConfirmed}>
                      <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                      <View style={styles.locationConfirmedCopy}>
                        <Text style={styles.locationConfirmedTitle}>Location confirmed</Text>
                        <Text style={styles.locationConfirmedText}>{requestLocation.address}</Text>
                      </View>
                    </View>
                  ) : null}
                  {locationNotice ? <Text style={styles.locationNotice}>{locationNotice}</Text> : null}
                </View>

                <View style={styles.promotionSection}>
                  <TouchableOpacity
                    style={styles.promotionToggle}
                    onPress={() => setShowPromotions((visible) => !visible)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showPromotions }}
                  >
                    <View style={styles.promotionToggleIcon}><Ionicons name="megaphone-outline" size={21} color={colors.accentDark} /></View>
                    <View style={styles.promotionToggleCopy}>
                      <Text style={styles.promotionTitle}>Optional request visibility</Text>
                      <Text style={styles.promotionText}>{activePackage.id === 'free' ? 'Publish normally for free or review paid placement.' : `${activePackage.name} selected • ${formatPackagePrice(activePackage)}`}</Text>
                    </View>
                    <Ionicons name={showPromotions ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
                  </TouchableOpacity>

                  {showPromotions ? (
                    <View style={styles.packageList}>
                      {loadingPackages ? <Text style={styles.packageLoadingText}>Loading current options...</Text> : null}
                      {promotionNotice ? <Text style={styles.promotionNotice}>{promotionNotice}</Text> : null}
                      {packages.map((item) => {
                        const selected = item.id === activePackage.id;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.packageOption, selected && styles.packageOptionActive]}
                            onPress={() => setSelectedPackageId(item.id)}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: selected }}
                          >
                            <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.muted} />
                            <View style={styles.packageCopy}>
                              <View style={styles.packageNameRow}>
                                <Text style={styles.packageName}>{item.name}</Text>
                                {item.urgent ? <StatusBadge label="Urgent label" tone="warning" compact /> : item.featured ? <StatusBadge label="Featured" tone="info" compact /> : null}
                              </View>
                              <Text style={styles.packageDescription}>{packageDescription(item)}</Text>
                            </View>
                            <Text style={styles.packagePrice}>{formatPackagePrice(item)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      {activePackage.id !== 'free' ? (
                        <View style={styles.checkoutNotice}>
                          <Ionicons name="lock-closed-outline" size={17} color={colors.warning} />
                          <Text style={styles.checkoutNoticeText}>Secure checkout opens before publishing. If checkout is cancelled, the request is not posted.</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <View style={[styles.publishFooter, isWide && styles.publishFooterWide]}>
                  <View style={styles.publishSummary}>
                    <Text style={styles.publishSummaryLabel}>Publishing as</Text>
                    <Text style={styles.publishSummaryValue}>{activePackage.name} • {formatPackagePrice(activePackage)}</Text>
                  </View>
                  <AppButton
                    label={activePackage.id === 'free' ? 'Publish request' : 'Continue to secure checkout'}
                    icon={activePackage.id === 'free' ? 'paper-plane-outline' : 'lock-closed-outline'}
                    fullWidth={!isWide}
                    loading={publishing}
                    onPress={handlePublish}
                  />
                </View>

                <View style={styles.safetyNote}>
                  <Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} />
                  <Text style={styles.safetyText}>Keep conversations and offers in SolveConnect, review provider information, and never share passwords or verification codes.</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatLabel(value: string) {
  return value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatPackagePrice(item: PromotionPackage) {
  if (!item.price) return 'Free';
  const symbol = item.currency.toUpperCase() === 'NGN' ? '₦' : `${item.currency.toUpperCase()} `;
  return `${symbol}${item.price.toLocaleString()}`;
}

function packageDescription(item: PromotionPackage) {
  if (item.id === 'free') return 'Standard placement with no payment required.';
  const duration = item.duration_days ? ` for ${item.duration_days} days` : '';
  if (item.urgent) return `Higher-priority placement with an urgent label${duration}.`;
  if (item.featured) return `Featured placement${duration}.`;
  return `Improved placement${duration}.`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.page },
  pageFrame: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: spacing.lg },
  header: { paddingHorizontal: 0, paddingTop: spacing.md, paddingBottom: spacing.lg },
  progressTrack: { height: 5, borderRadius: radius.sm, backgroundColor: colors.border, overflow: 'hidden', marginBottom: spacing.xl },
  progressFill: { width: '50%', height: '100%', backgroundColor: colors.primary },
  progressFillComplete: { width: '100%' },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  errorText: { ...typography.body, flex: 1, color: colors.danger },
  formSection: { gap: spacing.xl },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { ...typography.label, color: colors.ink },
  required: { color: colors.danger },
  fieldHelp: { ...typography.caption, color: colors.muted },
  categoryScroller: { gap: spacing.sm, paddingRight: spacing.lg },
  categoryChip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  categoryChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  categoryChipText: { ...typography.label, color: colors.muted },
  categoryChipTextActive: { color: colors.inverse },
  categorySummary: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.subtle },
  categorySummaryIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surface },
  categorySummaryCopy: { flex: 1 },
  categorySummaryTitle: { ...typography.label, color: colors.ink },
  categorySummaryText: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  formFooter: { alignItems: 'flex-start', gap: spacing.sm, paddingTop: spacing.sm },
  footerNote: { ...typography.caption, color: colors.muted },
  requestSummary: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.low },
  summaryTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  summaryIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.subtle },
  summaryCopy: { flex: 1 },
  summaryEyebrow: { ...typography.overline, color: colors.primary },
  summaryTitle: { ...typography.title, color: colors.ink, marginTop: spacing.xs },
  editButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  editButtonText: { ...typography.label, color: colors.primary },
  summaryDescription: { ...typography.body, color: colors.muted },
  summaryBudgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  summaryBudgetLabel: { ...typography.caption, color: colors.muted },
  summaryBudget: { ...typography.title, color: colors.ink },
  sectionTitle: { ...typography.h3, color: colors.ink },
  locationActions: { gap: spacing.sm },
  locationActionsWide: { flexDirection: 'row', alignItems: 'center' },
  locationConfirmed: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  locationConfirmedCopy: { flex: 1 },
  locationConfirmedTitle: { ...typography.label, color: colors.success },
  locationConfirmedText: { ...typography.caption, color: colors.success, marginTop: spacing.xs },
  locationNotice: { ...typography.caption, color: colors.info },
  promotionSection: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  promotionToggle: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  promotionToggleIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.accentSoft },
  promotionToggleCopy: { flex: 1 },
  promotionTitle: { ...typography.label, color: colors.ink },
  promotionText: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  packageList: { gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.canvas },
  packageLoadingText: { ...typography.caption, color: colors.muted },
  promotionNotice: { ...typography.caption, color: colors.warning },
  packageOption: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  packageOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  packageCopy: { flex: 1 },
  packageNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  packageName: { ...typography.label, color: colors.ink },
  packageDescription: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  packagePrice: { ...typography.label, color: colors.ink },
  checkoutNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.warningSoft },
  checkoutNoticeText: { ...typography.caption, flex: 1, color: colors.warning },
  publishFooter: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.ink },
  publishFooterWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publishSummary: { flex: 1 },
  publishSummaryLabel: { ...typography.caption, color: '#B8C8C1' },
  publishSummaryValue: { ...typography.title, color: colors.inverse, marginTop: spacing.xs },
  safetyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.subtle },
  safetyText: { ...typography.caption, flex: 1, color: colors.muted },
});
