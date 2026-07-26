import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppButton, EmptyState, FormField, LoadingState, ScreenHeader, StatusBadge } from '../../components/ui';
import { colors, getServiceCategoryLabel, radius, shadows, spacing, typography } from '../../constants';
import { getJobPromotion, jobAPI, offerAPI, reviewAPI, userAPI } from '../../services/api';
import { getApiErrorMessage } from '../../services/error';
import { useAuthStore } from '../../store/authStore';

type OfferDraft = {
  quote: string;
  message: string;
  timeline: string;
  availability: string;
};

const EMPTY_OFFER: OfferDraft = { quote: '', message: '', timeline: '', availability: '' };

const STATUS_STEPS = ['posted', 'accepted', 'in_progress', 'completed'] as const;

export default function JobDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { width } = useWindowDimensions();
  const { user } = useAuthStore();
  const jobId = params.id || '';
  const [job, setJob] = useState<any>(null);
  const [jobOwner, setJobOwner] = useState<any>(null);
  const [connectedProvider, setConnectedProvider] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerDraft, setOfferDraft] = useState<OfferDraft>(EMPTY_OFFER);
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSent, setOfferSent] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [problemSolved, setProblemSolved] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const isWide = width >= 760;

  const loadJobDetails = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!jobId) return;
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setLoadError(null);

    try {
      const response = await jobAPI.getJob(jobId);
      const nextJob = response.data;
      setJob(nextJob);

      const relatedRequests: Promise<void>[] = [];
      if (nextJob.user_id) {
        relatedRequests.push(
          userAPI.getUser(nextJob.user_id)
            .then((ownerResponse) => setJobOwner(ownerResponse.data))
            .catch(() => setJobOwner(null)),
        );
      }
      if (nextJob.helper_id) {
        relatedRequests.push(
          userAPI.getUser(nextJob.helper_id)
            .then((providerResponse) => setConnectedProvider(providerResponse.data))
            .catch(() => setConnectedProvider(null)),
        );
      } else {
        setConnectedProvider(null);
      }

      const participant = user?._id === nextJob.user_id || user?._id === nextJob.helper_id;
      if (participant) {
        relatedRequests.push(
          offerAPI.getJobOffers(jobId)
            .then((offersResponse) => setOffers(Array.isArray(offersResponse.data) ? offersResponse.data : []))
            .catch(() => setOffers([])),
        );
      } else {
        setOffers([]);
      }

      await Promise.allSettled(relatedRequests);
    } catch (error) {
      setJob(null);
      setLoadError(getApiErrorMessage(error, 'We could not load this request.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId, user?._id]);

  useEffect(() => {
    void loadJobDetails();
  }, [loadJobDetails]);

  const isJobPoster = user?._id === job?.user_id;
  const isConnectedProvider = user?._id === job?.helper_id;
  const canSendOffer = user?.role === 'helper' && !isJobPoster && job?.status === 'posted';
  const canChat = Boolean((isJobPoster || isConnectedProvider) && job?.status !== 'posted');
  const canStartWork = Boolean((isJobPoster || isConnectedProvider) && job?.status === 'accepted');
  const canCompleteWork = Boolean(isJobPoster && job?.status === 'in_progress');
  const promotion = job ? getJobPromotion(job) : null;
  const analysis = job?.ai_analysis && typeof job.ai_analysis === 'object' ? job.ai_analysis : null;

  const statusIndex = useMemo(() => {
    const index = STATUS_STEPS.indexOf(job?.status);
    return index < 0 ? 0 : index;
  }, [job?.status]);

  const updateOfferDraft = (key: keyof OfferDraft, value: string) => {
    setOfferDraft((current) => ({ ...current, [key]: value }));
  };

  const handleCreateOffer = async () => {
    const quote = Number(offerDraft.quote);
    if (!Number.isFinite(quote) || quote <= 0) {
      setActionError('Enter a quote greater than zero.');
      return;
    }
    if (offerDraft.message.trim().length < 20) {
      setActionError('Explain your approach in at least 20 characters.');
      return;
    }
    if (!offerDraft.timeline.trim() || !offerDraft.availability.trim()) {
      setActionError('Add your estimated timeline and availability.');
      return;
    }

    setOfferSubmitting(true);
    setActionError(null);
    try {
      await offerAPI.createOffer(jobId, {
        quote,
        message: offerDraft.message.trim(),
        timeline: offerDraft.timeline.trim(),
        availability: offerDraft.availability.trim(),
        provider_type: 'expert',
      });
      setOfferSent(true);
      setShowOfferForm(false);
      setOfferDraft(EMPTY_OFFER);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'We could not send this offer.'));
    } finally {
      setOfferSubmitting(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    setAcceptingOfferId(offerId);
    setActionError(null);
    try {
      await offerAPI.acceptOffer(offerId);
      await loadJobDetails('refresh');
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'We could not accept this offer.'));
    } finally {
      setAcceptingOfferId(null);
    }
  };

  const confirmAcceptOffer = (offer: any) => {
    Alert.alert(
      'Accept this offer?',
      `You are choosing ${offer.provider_name || 'this provider'} at ${formatMoney(offer.quote)}. Other pending offers will close.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept offer', onPress: () => void acceptOffer(offer._id) },
      ],
    );
  };

  const handleUpdateStatus = async (nextStatus: 'in_progress' | 'completed') => {
    setStatusUpdating(true);
    setActionError(null);
    try {
      await jobAPI.updateJobStatus(jobId, nextStatus);
      await loadJobDetails('refresh');
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'We could not update the job status.'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const confirmCompleteWork = () => {
    Alert.alert(
      'Mark this work complete?',
      'Only continue when the agreed work has been completed. You can leave a review afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark complete', onPress: () => void handleUpdateStatus('completed') },
      ],
    );
  };

  const handleSubmitReview = async () => {
    if (!job?.helper_id) return;
    if (rating < 1) {
      setActionError('Choose a rating from 1 to 5 stars.');
      return;
    }
    if (reviewComment.trim().length < 10) {
      setActionError('Add a short comment with at least 10 characters.');
      return;
    }

    setReviewSubmitting(true);
    setActionError(null);
    try {
      await reviewAPI.createReview({
        job_id: jobId,
        helper_id: job.helper_id,
        rating,
        comment: reviewComment.trim(),
        solved: problemSolved,
      });
      setReviewSubmitted(true);
      setShowReviewForm(false);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'We could not submit this review.'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><LoadingState fullScreen label="Loading request details..." /></SafeAreaView>;
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Request details" onBack={() => router.back()} compact />
        <EmptyState
          icon="cloud-offline-outline"
          title="Request unavailable"
          description={loadError || 'This request may have been removed or is not available.'}
          actionLabel="Try again"
          onAction={() => loadJobDetails()}
          secondaryActionLabel="Go back"
          onSecondaryAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadJobDetails('refresh')} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          <ScreenHeader
            eyebrow={getServiceCategoryLabel(job.category)}
            title={job.title || 'Service request'}
            subtitle={job.location?.address ? `Service location: ${job.location.address}` : undefined}
            onBack={() => router.back()}
            style={styles.header}
            rightAction={<StatusBadge label={formatLabel(job.status || 'posted')} tone={statusTone(job.status)} />}
          />

          <View style={styles.progressSection}>
            {STATUS_STEPS.map((status, index) => (
              <React.Fragment key={status}>
                <View style={styles.progressItem}>
                  <View style={[styles.progressDot, index <= statusIndex && styles.progressDotActive]}>
                    {index < statusIndex ? <Ionicons name="checkmark" size={13} color={colors.inverse} /> : null}
                  </View>
                  <Text style={[styles.progressLabel, index <= statusIndex && styles.progressLabelActive]}>{formatLabel(status)}</Text>
                </View>
                {index < STATUS_STEPS.length - 1 ? <View style={[styles.progressLine, index < statusIndex && styles.progressLineActive]} /> : null}
              </React.Fragment>
            ))}
          </View>

          {promotion && promotion.id !== 'free' ? (
            <View style={styles.promotionBanner}>
              <Ionicons name={promotion.id === 'top' ? 'flash' : 'trending-up'} size={20} color={colors.warning} />
              <View style={styles.promotionCopy}>
                <Text style={styles.promotionTitle}>{promotion.label}</Text>
                <Text style={styles.promotionText}>{promotion.id === 'top' ? 'This request has priority placement and an urgent label.' : 'This request has improved placement in relevant listings.'}</Text>
              </View>
            </View>
          ) : null}

          {actionError ? (
            <View style={styles.errorBanner} accessibilityLiveRegion="polite">
              <Ionicons name="alert-circle-outline" size={19} color={colors.danger} />
              <Text style={styles.errorText}>{actionError}</Text>
              <TouchableOpacity onPress={() => setActionError(null)} accessibilityRole="button" accessibilityLabel="Dismiss error"><Ionicons name="close" size={20} color={colors.danger} /></TouchableOpacity>
            </View>
          ) : null}

          {offerSent ? (
            <View style={styles.successBanner} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>Your offer was sent. The customer will see the quote, timing, and message.</Text>
            </View>
          ) : null}

          <View style={[styles.detailsGrid, isWide && styles.detailsGridWide]}>
            <View style={styles.budgetPanel}>
              <Text style={styles.factLabel}>Working budget</Text>
              <Text style={styles.budgetValue}>{formatMoney(job.budget)}</Text>
              <Text style={styles.factNote}>Providers may explain a different quote.</Text>
            </View>
            <View style={styles.requestFacts}>
              <View style={styles.factRow}><Ionicons name="pricetag-outline" size={18} color={colors.primary} /><View style={styles.factCopy}><Text style={styles.factLabel}>Category</Text><Text style={styles.factValue}>{getServiceCategoryLabel(job.category)}</Text></View></View>
              {job.location?.address ? <View style={styles.factRow}><Ionicons name="location-outline" size={18} color={colors.info} /><View style={styles.factCopy}><Text style={styles.factLabel}>Location</Text><Text style={styles.factValue}>{job.location.address}</Text></View></View> : null}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request description</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>

          {analysis ? (
            <View style={styles.guidancePanel}>
              <View style={styles.guidanceHeader}>
                <View style={styles.guidanceIcon}><Ionicons name="sparkles-outline" size={20} color={colors.info} /></View>
                <View style={styles.guidanceCopy}>
                  <Text style={styles.guidanceEyebrow}>AUTOMATED REQUEST GUIDANCE</Text>
                  <Text style={styles.guidanceTitle}>{analysis.category || getServiceCategoryLabel(job.category)}</Text>
                </View>
              </View>
              <View style={styles.guidanceFacts}>
                {analysis.urgency ? <GuidanceFact label="Urgency" value={String(analysis.urgency)} /> : null}
                {analysis.complexity ? <GuidanceFact label="Complexity" value={String(analysis.complexity)} /> : null}
                {analysis.estimated_timeline ? <GuidanceFact label="Possible timeline" value={String(analysis.estimated_timeline)} /> : null}
                {analysis.estimated_cost ? <GuidanceFact label="Indicative range" value={formatAnalysisCost(analysis.estimated_cost)} /> : null}
              </View>
              <Text style={styles.guidanceDisclaimer}>This is automated guidance, not a provider quote or guarantee. Confirm scope, price, and timing before work begins.</Text>
            </View>
          ) : null}

          {canSendOffer ? (
            <View style={styles.section}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.sectionTitle}>Respond to this request</Text>
                  <Text style={styles.sectionSubtitle}>Send a specific quote only after reviewing the scope and location.</Text>
                </View>
                {!showOfferForm && !offerSent ? <AppButton label="Send an offer" size="small" icon="paper-plane-outline" onPress={() => setShowOfferForm(true)} /> : null}
              </View>
              {showOfferForm ? (
                <View style={styles.offerForm}>
                  <FormField label="Your quote" required leftIcon="cash-outline" placeholder="Amount in naira" value={offerDraft.quote} onChangeText={(value) => updateOfferDraft('quote', value.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />
                  <FormField label="How you will help" required leftIcon="document-text-outline" placeholder="Explain your approach, what is included, and any assumptions." value={offerDraft.message} onChangeText={(value) => updateOfferDraft('message', value)} multiline maxLength={800} helperText={`${offerDraft.message.length}/800 characters`} />
                  <View style={[styles.offerFormRow, isWide && styles.offerFormRowWide]}>
                    <FormField label="Estimated timeline" required leftIcon="time-outline" placeholder="e.g. 1-2 days" value={offerDraft.timeline} onChangeText={(value) => updateOfferDraft('timeline', value)} containerStyle={styles.offerFormField} />
                    <FormField label="Availability" required leftIcon="calendar-outline" placeholder="e.g. From Monday" value={offerDraft.availability} onChangeText={(value) => updateOfferDraft('availability', value)} containerStyle={styles.offerFormField} />
                  </View>
                  <View style={styles.offerFormActions}>
                    <AppButton label="Send offer" icon="paper-plane-outline" loading={offerSubmitting} onPress={handleCreateOffer} />
                    <AppButton label="Cancel" variant="ghost" onPress={() => setShowOfferForm(false)} />
                  </View>
                  <Text style={styles.offerDisclaimer}>The customer can compare this with other offers. Do not request payment or sensitive information in the offer message.</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {isJobPoster ? (
            <View style={styles.section}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.sectionTitle}>Provider offers</Text>
                  <Text style={styles.sectionSubtitle}>Compare each provider’s message, timing, availability, and price.</Text>
                </View>
                <StatusBadge label={`${offers.length} ${offers.length === 1 ? 'offer' : 'offers'}`} tone="info" />
              </View>
              {offers.length === 0 ? (
                <EmptyState compact icon="mail-open-outline" title="No offers yet" description="Providers can send a quote while this request remains open." />
              ) : (
                <View style={styles.offerList}>
                  {offers.map((offer) => (
                    <View key={offer._id} style={styles.offerCard}>
                      <View style={styles.offerHeader}>
                        <View style={styles.offerAvatar}><Text style={styles.offerAvatarText}>{(offer.provider_name || 'P').charAt(0).toUpperCase()}</Text></View>
                        <View style={styles.offerHeaderCopy}>
                          <Text style={styles.offerProvider}>{offer.provider_name || 'Service provider'}</Text>
                          <Text style={styles.offerMeta}>{offer.availability || 'Availability not stated'}</Text>
                        </View>
                        <StatusBadge label={formatLabel(offer.status || 'pending')} tone={offer.status === 'accepted' ? 'success' : offer.status === 'declined' ? 'neutral' : 'warning'} compact />
                      </View>
                      <Text style={styles.offerMessage}>{offer.message}</Text>
                      <View style={styles.offerFacts}>
                        <View><Text style={styles.offerFactLabel}>Quote</Text><Text style={styles.offerFactValue}>{formatMoney(offer.quote)}</Text></View>
                        <View><Text style={styles.offerFactLabel}>Timeline</Text><Text style={styles.offerFactValue}>{offer.timeline || 'Not stated'}</Text></View>
                      </View>
                      {offer.status === 'pending' && job.status === 'posted' ? (
                        <AppButton label="Accept this offer" icon="checkmark-circle-outline" fullWidth loading={acceptingOfferId === offer._id} disabled={Boolean(acceptingOfferId && acceptingOfferId !== offer._id)} onPress={() => confirmAcceptOffer(offer)} />
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          <View style={[styles.peopleGrid, isWide && styles.peopleGridWide]}>
            {jobOwner ? <PersonPanel title="Posted by" person={jobOwner} icon="person-outline" /> : null}
            {connectedProvider ? (
              <TouchableOpacity style={styles.personPanel} onPress={() => router.push(`/helper/${connectedProvider._id}`)} accessibilityRole="button" accessibilityLabel={`View ${connectedProvider.name || 'provider'} profile`}>
                <PersonPanelContent title="Connected provider" person={connectedProvider} icon="briefcase-outline" />
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isJobPoster && job.status === 'posted' ? (
            <View style={styles.discoveryCallout}>
              <Ionicons name="people-outline" size={23} color={colors.info} />
              <View style={styles.discoveryCopy}>
                <Text style={styles.discoveryTitle}>Want to review providers while offers arrive?</Text>
                <Text style={styles.discoveryText}>Browse real profiles and work history in the provider directory.</Text>
              </View>
              <AppButton label="Browse providers" size="small" variant="outline" onPress={() => router.push(`/(tabs)/helpers?category=${job.category}`)} />
            </View>
          ) : null}

          {isJobPoster && job.status === 'accepted' ? (
            <View style={styles.paymentNotice}>
              <Ionicons name="card-outline" size={21} color={colors.warning} />
              <View style={styles.paymentNoticeCopy}>
                <Text style={styles.paymentNoticeTitle}>Booking payment checkout is being prepared</Text>
                <Text style={styles.paymentNoticeText}>No payment will be marked complete from this screen. Confirm scope and next steps with the provider in chat.</Text>
              </View>
            </View>
          ) : null}

          {isJobPoster && job.status === 'completed' && job.helper_id ? (
            <View style={styles.reviewSection}>
              {reviewSubmitted ? (
                <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={20} color={colors.success} /><Text style={styles.successText}>Review submitted. Thank you for helping others make informed choices.</Text></View>
              ) : (
                <>
                  <View style={styles.sectionHeadingRow}>
                    <View style={styles.sectionHeadingCopy}><Text style={styles.sectionTitle}>Share the outcome</Text><Text style={styles.sectionSubtitle}>Your review is linked to this completed job.</Text></View>
                    {!showReviewForm ? <AppButton label="Leave a review" size="small" icon="star-outline" onPress={() => setShowReviewForm(true)} /> : null}
                  </View>
                  {showReviewForm ? (
                    <View style={styles.reviewForm}>
                      <Text style={styles.reviewLabel}>Overall rating</Text>
                      <View style={styles.starRow} accessibilityRole="radiogroup">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <TouchableOpacity key={value} style={styles.starButton} onPress={() => setRating(value)} accessibilityRole="radio" accessibilityState={{ checked: rating === value }} accessibilityLabel={`${value} stars`}>
                            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={30} color={value <= rating ? colors.accent : colors.borderStrong} />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <FormField label="Review comment" required placeholder="What went well, and what should future customers know?" value={reviewComment} onChangeText={setReviewComment} multiline maxLength={600} />
                      <View style={styles.solvedRow}>
                        <Text style={styles.solvedLabel}>Was the problem solved?</Text>
                        <View style={styles.solvedActions}>
                          <TouchableOpacity style={[styles.solvedOption, problemSolved && styles.solvedOptionActive]} onPress={() => setProblemSolved(true)} accessibilityRole="radio" accessibilityState={{ checked: problemSolved }}><Text style={[styles.solvedOptionText, problemSolved && styles.solvedOptionTextActive]}>Yes</Text></TouchableOpacity>
                          <TouchableOpacity style={[styles.solvedOption, !problemSolved && styles.solvedOptionActive]} onPress={() => setProblemSolved(false)} accessibilityRole="radio" accessibilityState={{ checked: !problemSolved }}><Text style={[styles.solvedOptionText, !problemSolved && styles.solvedOptionTextActive]}>No</Text></TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.offerFormActions}><AppButton label="Submit review" icon="star-outline" loading={reviewSubmitting} onPress={handleSubmitReview} /><AppButton label="Cancel" variant="ghost" onPress={() => setShowReviewForm(false)} /></View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {canSendOffer || canChat || canStartWork || canCompleteWork ? (
        <View style={styles.actionFooter}>
          <View style={[styles.actionFooterInner, isWide && styles.actionFooterInnerWide]}>
            {canSendOffer && !offerSent ? <AppButton label={showOfferForm ? 'Complete offer above' : 'Send an offer'} icon="paper-plane-outline" fullWidth={!isWide} onPress={() => setShowOfferForm(true)} /> : null}
            {canChat ? <AppButton label="Open chat" variant="outline" icon="chatbubble-outline" fullWidth={!isWide} onPress={() => router.push(`/chat/${jobId}`)} /> : null}
            {canStartWork ? <AppButton label="Start work" icon="play-outline" fullWidth={!isWide} loading={statusUpdating} onPress={() => handleUpdateStatus('in_progress')} /> : null}
            {canCompleteWork ? <AppButton label="Mark work complete" icon="checkmark-done-outline" fullWidth={!isWide} loading={statusUpdating} onPress={confirmCompleteWork} /> : null}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function GuidanceFact({ label, value }: { label: string; value: string }) {
  return <View style={styles.guidanceFact}><Text style={styles.guidanceFactLabel}>{label}</Text><Text style={styles.guidanceFactValue}>{value}</Text></View>;
}

function PersonPanel({ title, person, icon }: { title: string; person: any; icon: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.personPanel}><PersonPanelContent title={title} person={person} icon={icon} /></View>;
}

function PersonPanelContent({ title, person, icon }: { title: string; person: any; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <>
      {person.profile_photo ? <Image source={{ uri: person.profile_photo }} style={styles.personImage} contentFit="cover" cachePolicy="disk" /> : <View style={styles.personFallback}><Ionicons name={icon} size={21} color={colors.primary} /></View>}
      <View style={styles.personCopy}><Text style={styles.personEyebrow}>{title}</Text><Text style={styles.personName}>{person.name || 'SolveConnect member'}</Text></View>
    </>
  );
}

function formatLabel(value: string) {
  return value.split('_').join(' ').split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : 'Not stated';
}

function formatAnalysisCost(value: any) {
  if (typeof value === 'string') return value;
  if (value?.label) return String(value.label).replace(/^NGN\s*/i, '₦');
  if (Number.isFinite(Number(value?.min)) && Number.isFinite(Number(value?.max))) return `₦${Number(value.min).toLocaleString()} - ₦${Number(value.max).toLocaleString()}`;
  return 'Not available';
}

function statusTone(status?: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'info';
  if (status === 'accepted') return 'warning';
  return 'neutral';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { paddingBottom: 120 },
  pageFrame: { width: '100%', maxWidth: 880, alignSelf: 'center', paddingHorizontal: spacing.lg },
  header: { paddingHorizontal: 0, paddingTop: spacing.md, paddingBottom: spacing.lg },
  progressSection: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  progressItem: { width: 70, alignItems: 'center', gap: spacing.xs },
  progressDot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  progressDotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  progressLabel: { ...typography.caption, color: colors.muted, textAlign: 'center' },
  progressLabelActive: { color: colors.ink, fontWeight: '700' },
  progressLine: { flex: 1, height: 2, marginTop: 11, backgroundColor: colors.border },
  progressLineActive: { backgroundColor: colors.primary },
  promotionBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.warningSoft },
  promotionCopy: { flex: 1 },
  promotionTitle: { ...typography.label, color: colors.warning },
  promotionText: { ...typography.caption, color: colors.warning, marginTop: spacing.xs },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerSoft },
  errorText: { ...typography.body, flex: 1, color: colors.danger },
  successBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  successText: { ...typography.body, flex: 1, color: colors.success },
  detailsGrid: { gap: spacing.md },
  detailsGridWide: { flexDirection: 'row' },
  budgetPanel: { flex: 0.8, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.ink },
  factLabel: { ...typography.caption, color: colors.muted },
  budgetValue: { ...typography.h2, color: colors.inverse, marginTop: spacing.sm },
  factNote: { ...typography.caption, color: '#B8C8C1', marginTop: spacing.sm },
  requestFacts: { flex: 1.2, gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  factRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  factCopy: { flex: 1 },
  factValue: { ...typography.bodyStrong, color: colors.ink, marginTop: spacing.xs },
  section: { marginTop: spacing.section },
  sectionTitle: { ...typography.h3, color: colors.ink },
  sectionSubtitle: { ...typography.body, color: colors.muted, marginTop: spacing.xs },
  description: { ...typography.bodyLarge, color: colors.muted, marginTop: spacing.md },
  guidancePanel: { gap: spacing.md, marginTop: spacing.section, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: '#BFD3E4', backgroundColor: colors.infoSoft },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guidanceIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.surface },
  guidanceCopy: { flex: 1 },
  guidanceEyebrow: { ...typography.overline, color: colors.info },
  guidanceTitle: { ...typography.title, color: colors.ink, marginTop: spacing.xs },
  guidanceFacts: { gap: spacing.sm },
  guidanceFact: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: '#C9DCEB' },
  guidanceFactLabel: { ...typography.caption, color: colors.muted },
  guidanceFactValue: { ...typography.label, flex: 1, color: colors.ink, textAlign: 'right' },
  guidanceDisclaimer: { ...typography.caption, color: colors.info },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  sectionHeadingCopy: { flex: 1 },
  offerForm: { gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.low },
  offerFormRow: { gap: spacing.lg },
  offerFormRowWide: { flexDirection: 'row' },
  offerFormField: { flex: 1 },
  offerFormActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  offerDisclaimer: { ...typography.caption, color: colors.muted },
  offerList: { gap: spacing.md },
  offerCard: { gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offerAvatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  offerAvatarText: { fontSize: 17, fontWeight: '700', color: colors.primary },
  offerHeaderCopy: { flex: 1 },
  offerProvider: { ...typography.title, color: colors.ink },
  offerMeta: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  offerMessage: { ...typography.body, color: colors.muted },
  offerFacts: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xl, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.subtle },
  offerFactLabel: { ...typography.caption, color: colors.muted },
  offerFactValue: { ...typography.label, color: colors.ink, marginTop: spacing.xs },
  peopleGrid: { gap: spacing.md, marginTop: spacing.section },
  peopleGridWide: { flexDirection: 'row' },
  personPanel: { flex: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  personImage: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.subtle },
  personFallback: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  personCopy: { flex: 1 },
  personEyebrow: { ...typography.overline, color: colors.primary },
  personName: { ...typography.label, color: colors.ink, marginTop: spacing.xs },
  discoveryCallout: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.section, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.infoSoft },
  discoveryCopy: { flex: 1, minWidth: 220 },
  discoveryTitle: { ...typography.label, color: colors.ink },
  discoveryText: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
  paymentNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.section, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.warningSoft },
  paymentNoticeCopy: { flex: 1 },
  paymentNoticeTitle: { ...typography.label, color: colors.warning },
  paymentNoticeText: { ...typography.caption, color: colors.warning, marginTop: spacing.xs },
  reviewSection: { marginTop: spacing.section },
  reviewForm: { gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  reviewLabel: { ...typography.label, color: colors.ink },
  starRow: { flexDirection: 'row', gap: spacing.xs },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  solvedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  solvedLabel: { ...typography.label, color: colors.ink },
  solvedActions: { flexDirection: 'row', gap: spacing.sm },
  solvedOption: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  solvedOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  solvedOptionText: { ...typography.label, color: colors.muted },
  solvedOptionTextActive: { color: colors.inverse },
  actionFooter: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  actionFooterInner: { width: '100%', maxWidth: 880, alignSelf: 'center', gap: spacing.sm, padding: spacing.md },
  actionFooterInnerWide: { flexDirection: 'row', justifyContent: 'flex-end' },
});
