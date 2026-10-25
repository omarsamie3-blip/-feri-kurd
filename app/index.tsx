import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ALPHABET,
  CATEGORIES,
  CULTURE_ITEMS,
  DIALOGUES,
  PICTURE_GAME_ITEMS,
  TOTAL_PHRASES,
} from './content';

type Screen =
  | 'welcome'
  | 'login'
  | 'register'
  | 'home'
  | 'alphabet'
  | 'lessons'
  | 'conversation'
  | 'listening'
  | 'quiz'
  | 'progress'
  | 'culture'
  | 'dictionary'
  | 'games';

type QuizQuestion = {
  ku: string;
  ar: string;
  options: string[];
  answer: number;
};

type PictureQuestion = {
  emoji: string;
  ar: string;
  answer: string;
  options: string[];
};

const W = Dimensions.get('window').width;

const K = {
  red: '#D71920',
  redDark: '#A60E14',
  green: '#168B45',
  greenDark: '#0E6933',
  yellow: '#F6C515',
  gold: '#D79D00',
  white: '#FFFFFF',
  ink: '#171717',
  muted: '#6E6E73',
  line: '#E8E8EA',
  bg: '#F7F7F8',
  cream: '#FFF9EA',
  softGreen: '#EAF7EF',
  softRed: '#FDECEE',
  softYellow: '#FFF5C7',
  softBlue: '#EDF4FF',
  blue: '#4A7BD0',
  purple: '#7B61C9',
};

const STORE = {
  points: 'ferikurdi.points.v3',
  completed: 'ferikurdi.completed.v3',
  user: 'ferikurdi.user.v3',
  sound: 'ferikurdi.sound.v3',
};

const ALL_PHRASES = CATEGORIES.flatMap((c) =>
  c.phrases.map((p) => ({ ...p, category: c.title, emoji: c.emoji })),
);

function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeQuiz(count = 12): QuizQuestion[] {
  return shuffle(ALL_PHRASES)
    .slice(0, count)
    .map((target) => {
      const wrong = shuffle(ALL_PHRASES.filter((x) => x.ar !== target.ar))
        .slice(0, 3)
        .map((x) => x.ar);
      const options = shuffle([target.ar, ...wrong]);
      return {
        ku: target.ku,
        ar: target.ar,
        options,
        answer: options.indexOf(target.ar),
      };
    });
}

function makePictureQuestion(index = 0): PictureQuestion {
  const target = PICTURE_GAME_ITEMS[index % PICTURE_GAME_ITEMS.length];
  const wrong = shuffle(
    PICTURE_GAME_ITEMS.filter((x) => x.answer !== target.answer),
  )
    .slice(0, 3)
    .map((x) => x.answer);
  const options = shuffle([target.answer, ...wrong]);
  return {
    emoji: target.emoji,
    ar: target.ar,
    answer: target.answer,
    options,
  };
}

function kurmanjiForSpeech(input: string) {
  return input
    .replace(/\bXwe\b/g, 'Kho')
    .replace(/\bxwe\b/g, 'kho')
    .replace(/X/g, 'Kh')
    .replace(/x/g, 'kh');
}

function Tap({
  onPress,
  children,
  style,
  disabled,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, {
            toValue: 0.965,
            speed: 35,
            bounciness: 5,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, {
            toValue: 1,
            speed: 28,
            bounciness: 7,
            useNativeDriver: true,
          }).start()
        }
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function FlagStrip() {
  return (
    <View style={styles.flagStrip}>
      <View style={[styles.flagPiece, { backgroundColor: K.red }]} />
      <View style={[styles.flagPiece, { backgroundColor: K.white }]} />
      <View style={styles.flagSunWrap}>
        <Text style={styles.flagSun}>☀️</Text>
      </View>
      <View style={[styles.flagPiece, { backgroundColor: K.white }]} />
      <View style={[styles.flagPiece, { backgroundColor: K.green }]} />
    </View>
  );
}

function BackHeader({
  title,
  onBack,
  soundOn,
  onToggleSound,
}: {
  title: string;
  onBack: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
}) {
  return (
    <>
      <View style={styles.backHeader}>
        <Tap onPress={onBack}>
          <View style={styles.circleButton}>
            <Text style={styles.backArrow}>‹</Text>
          </View>
        </Tap>
        <Text style={styles.backTitle}>{title}</Text>
        <Tap onPress={onToggleSound}>
          <View style={styles.circleButton}>
            <Text style={{ fontSize: 20 }}>{soundOn ? '🔊' : '🔇'}</Text>
          </View>
        </Tap>
      </View>
      <FlagStrip />
    </>
  );
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={[K.green, K.yellow, K.red]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${width}%` }]}
      />
    </View>
  );
}

function PulseSun() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.09,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.Text style={[styles.pulseSun, { transform: [{ scale: pulse }] }]}>☀️</Animated.Text>
  );
}

function GovendAnimation() {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -5, duration: 300, useNativeDriver: true }),
        Animated.timing(y, { toValue: 2, duration: 300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  return (
    <Animated.View style={[styles.govendRow, { transform: [{ translateY: y }] }]}>
      <Text style={styles.govendPerson}>🕺</Text>
      <Text style={styles.govendHands}>〰️</Text>
      <Text style={styles.govendPerson}>💃</Text>
      <Text style={styles.govendHands}>〰️</Text>
      <Text style={styles.govendPerson}>🕺</Text>
      <Text style={styles.govendHands}>〰️</Text>
      <Text style={styles.govendPerson}>💃</Text>
    </Animated.View>
  );
}

function FireAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.12, duration: 260, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.96, duration: 260, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(rotate, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: -1, duration: 350, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rotate, scale]);
  const r = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-4deg', '4deg'] });
  return (
    <Animated.Text style={[styles.fireEmoji, { transform: [{ scale }, { rotate: r }] }]}>🔥</Animated.Text>
  );
}

function Confetti({ active }: { active: boolean }) {
  const pieces = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      x: Math.random() * W,
      y: new Animated.Value(-60 - Math.random() * 180),
      icon: ['🔴', '🟢', '🟡', '⭐', '🎉', '✨'][i % 6],
      delay: i * 24,
    })),
  ).current;

  useEffect(() => {
    if (!active) return;
    pieces.forEach((p) => {
      p.y.setValue(-80 - Math.random() * 180);
      Animated.timing(p.y, {
        toValue: 720 + Math.random() * 180,
        duration: 1400 + Math.random() * 1200,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [active, pieces]);

  if (!active) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: 0,
            fontSize: 17 + (i % 3) * 3,
            transform: [{ translateY: p.y }, { rotate: `${(i % 6) * 25}deg` }],
          }}
        >
          {p.icon}
        </Animated.Text>
      ))}
    </View>
  );
}

function FeatureCard({
  delay,
  emoji,
  title,
  subtitle,
  color,
  onPress,
}: {
  delay: number;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [
          {
            translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
          },
        ],
      }}
    >
      <Tap onPress={onPress}>
        <View style={styles.featureCard}>
          <View style={[styles.featureAccent, { backgroundColor: color }]} />
          <View style={styles.featureArrow}><Text style={styles.featureArrowText}>‹</Text></View>
          <View style={styles.featureTextWrap}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureSub}>{subtitle}</Text>
          </View>
          <View style={[styles.featureIcon, { backgroundColor: `${color}18` }]}>
            <Text style={styles.featureEmoji}>{emoji}</Text>
          </View>
        </View>
      </Tap>
    </Animated.View>
  );
}

export default function FeriKurdiV3() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [points, setPoints] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [listenIndex, setListenIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(() => makeQuiz(12));
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);
  const [quizDone, setQuizDone] = useState(false);
  const [pictureIndex, setPictureIndex] = useState(0);
  const [pictureScore, setPictureScore] = useState(0);
  const [pictureAnswered, setPictureAnswered] = useState<string | null>(null);

  const clickPlayer = useAudioPlayer(require('../assets/sounds/click.wav'));
  const correctPlayer = useAudioPlayer(require('../assets/sounds/correct.wav'));
  const wrongPlayer = useAudioPlayer(require('../assets/sounds/wrong.wav'));
  const winPlayer = useAudioPlayer(require('../assets/sounds/win.wav'));

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});

    (async () => {
      const [p, c, u, s] = await Promise.all([
        AsyncStorage.getItem(STORE.points),
        AsyncStorage.getItem(STORE.completed),
        AsyncStorage.getItem(STORE.user),
        AsyncStorage.getItem(STORE.sound),
      ]);
      if (p) setPoints(Number(p) || 0);
      if (c) setCompleted(JSON.parse(c));
      if (s === 'off') setSoundOn(false);
      if (u) setScreen('home');
    })().catch(() => {});
  }, []);

  const play = async (player: any) => {
    if (!soundOn) return;
    try {
      await player.seekTo(0);
      player.play();
    } catch {}
  };

  const tap = () => {
    play(clickPlayer);
    Haptics.selectionAsync().catch(() => {});
  };

  const speak = (text: string) => {
    if (!soundOn) return;
    Speech.stop();
    Speech.speak(kurmanjiForSpeech(text), {
      language: 'tr-TR',
      rate: 0.76,
      pitch: 1,
    });
  };

  const addPoints = async (n: number) => {
    const next = points + n;
    setPoints(next);
    await AsyncStorage.setItem(STORE.points, String(next));
  };

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    await AsyncStorage.setItem(STORE.sound, next ? 'on' : 'off');
    Haptics.selectionAsync().catch(() => {});
  };

  const goHome = () => {
    tap();
    setLessonId(null);
    setScreen('home');
  };

  const saveLocalUser = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('معلومات ناقصة', 'اكتب الاسم وكلمة المرور.');
      return;
    }
    await AsyncStorage.setItem(STORE.user, username.trim());
    tap();
    setScreen('home');
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORE.user);
    tap();
    setScreen('welcome');
  };

  const deleteLocalData = () => {
    Alert.alert(
      'حذف البيانات المحلية',
      'سيتم حذف اسم المستخدم والنقاط والدروس المكتملة من هذا الجهاز.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([STORE.user, STORE.points, STORE.completed]);
            setPoints(0);
            setCompleted([]);
            setScreen('welcome');
          },
        },
      ],
    );
  };

  const completeLesson = async (id: string) => {
    if (completed.includes(id)) return;
    const next = [...completed, id];
    setCompleted(next);
    await AsyncStorage.setItem(STORE.completed, JSON.stringify(next));
    await addPoints(30);
    play(winPlayer);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const progress = Math.round((completed.length / CATEGORIES.length) * 100);
  const lesson = CATEGORIES.find((c) => c.id === lessonId) || null;
  const listening = ALL_PHRASES[listenIndex % ALL_PHRASES.length];
  const filteredPhrases = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_PHRASES.slice(0, 60);
    return ALL_PHRASES.filter(
      (p) =>
        p.ku.toLowerCase().includes(q) ||
        p.ar.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    ).slice(0, 100);
  }, [query]);

  const answerQuiz = (choice: number) => {
    if (quizAnswered !== null || quizDone) return;
    setQuizAnswered(choice);
    const right = choice === quiz[quizIndex].answer;
    if (right) {
      setQuizScore((s) => s + 1);
      addPoints(10);
      play(correctPlayer);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      play(wrongPlayer);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
    setTimeout(() => {
      if (quizIndex >= quiz.length - 1) {
        setQuizDone(true);
        play(winPlayer);
      } else {
        setQuizIndex((i) => i + 1);
        setQuizAnswered(null);
      }
    }, 800);
  };

  const restartQuiz = () => {
    tap();
    setQuiz(makeQuiz(12));
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswered(null);
    setQuizDone(false);
  };

  const pictureQuestion = useMemo(() => makePictureQuestion(pictureIndex), [pictureIndex]);

  const answerPicture = (choice: string) => {
    if (pictureAnswered) return;
    setPictureAnswered(choice);
    const right = choice === pictureQuestion.answer;
    if (right) {
      setPictureScore((s) => s + 1);
      addPoints(8);
      play(correctPlayer);
    } else {
      play(wrongPlayer);
    }
    setTimeout(() => {
      const next = pictureIndex + 1;
      if (next >= PICTURE_GAME_ITEMS.length) {
        play(winPlayer);
        Alert.alert('🏆 Serkeftin!', `أنهيت لعبة الصور بنتيجة ${pictureScore + (right ? 1 : 0)} / ${PICTURE_GAME_ITEMS.length}`);
        setPictureIndex(0);
        setPictureScore(0);
      } else {
        setPictureIndex(next);
      }
      setPictureAnswered(null);
    }, 750);
  };

  if (screen === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <RNStatusBar barStyle="dark-content" />
        <ImageBackground
          source={require('../assets/images/ferikurdi_banner.png')}
          style={styles.welcomeBg}
          imageStyle={styles.welcomeBgImage}
        >
          <LinearGradient
            colors={['rgba(255,249,234,0.18)', 'rgba(255,255,255,0.90)', 'rgba(234,247,239,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.welcomeWrap}>
            <View style={styles.logoOrb}>
              <View style={[styles.logoBand, { backgroundColor: K.red }]} />
              <View style={styles.logoCenter}><PulseSun /></View>
              <View style={[styles.logoBand, { backgroundColor: K.green }]} />
            </View>
            <Text style={styles.brand}>fêrî kurdî</Text>
            <Text style={styles.tagline}>تعلّم • استمع • العب • اكتشف الثقافة</Text>
            <View style={styles.miniBadges}>
              <Text style={styles.miniBadge}>320 جملة</Text>
              <Text style={styles.miniBadge}>🎵 أصوات</Text>
              <Text style={styles.miniBadge}>☀️ ثقافة</Text>
              <Text style={styles.miniBadge}>🏆 ألعاب</Text>
            </View>
            <Tap onPress={() => { tap(); setScreen('register'); }} style={styles.fullWidth}>
              <LinearGradient colors={[K.red, K.redDark]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>إنشاء حساب جديد</Text>
              </LinearGradient>
            </Tap>
            <Tap onPress={() => { tap(); setScreen('login'); }} style={styles.fullWidth}>
              <View style={styles.secondaryBtn}><Text style={styles.secondaryBtnText}>الدخول إلى حساب موجود</Text></View>
            </Tap>
            <Tap onPress={() => { tap(); setScreen('home'); }}>
              <Text style={styles.guestText}>تخطي والدخول كضيف ←</Text>
            </Tap>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  if (screen === 'login' || screen === 'register') {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader
          title={screen === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
          onBack={() => setScreen('welcome')}
          soundOn={soundOn}
          onToggleSound={toggleSound}
        />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authScroll}>
          <View style={styles.authCard}>
            <Text style={styles.authEmoji}>{screen === 'login' ? '👋' : '☀️'}</Text>
            <Text style={styles.authKu}>{screen === 'login' ? 'Bi xêr hatî!' : 'Dest pê bike!'}</Text>
            <Text style={styles.authAr}>{screen === 'login' ? 'أهلاً بعودتك' : 'ابدأ رحلتك مع الكوردية'}</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="الاسم أو البريد الإلكتروني"
              placeholderTextColor="#999"
              style={styles.input}
              textAlign="right"
              autoCapitalize="none"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              placeholderTextColor="#999"
              style={styles.input}
              textAlign="right"
              secureTextEntry
            />
            <Tap onPress={saveLocalUser}>
              <LinearGradient colors={[K.green, K.greenDark]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>{screen === 'login' ? 'دخول' : 'إنشاء الحساب'}</Text>
              </LinearGradient>
            </Tap>
            <Text style={styles.noteText}>هذه الحزمة تحفظ الحساب والتقدم محلياً للاختبار. اربطها بخدمة حساباتك الحالية قبل رفع تحديث المتجر.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'home') {
    const features: [Screen, string, string, string, string][] = [
      ['alphabet', '🔤', 'الأبجدية', '31 حرفاً مع كلمات وصوت', K.red],
      ['lessons', '📚', 'الدروس', `${CATEGORIES.length} موضوعاً • ${TOTAL_PHRASES} جملة`, K.green],
      ['dictionary', '🔎', 'قاموس الجمل', 'ابحث بالكوردية أو العربية', K.blue],
      ['conversation', '🗣️', 'المحادثات', `${DIALOGUES.length} مواقف يومية`, K.yellow],
      ['listening', '🎧', 'الاستماع والنطق', 'اسمع ثم اكشف المعنى', K.purple],
      ['games', '🎮', 'الألعاب', 'لعبة الصور والكلمات', K.greenDark],
      ['quiz', '🧠', 'اختبار ذكي', 'أسئلة عشوائية ونقاط ومكافآت', K.redDark],
      ['culture', '☀️', 'الثقافة الكوردية', 'نوروز • كوفند • موسيقى • ضيافة', K.gold],
      ['progress', '🏆', 'تقدمي', 'نقاط وشارات وإنجازات', K.blue],
    ];

    return (
      <SafeAreaView style={styles.safe}>
        <RNStatusBar barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground
            source={require('../assets/images/ferikurdi_banner.png')}
            style={styles.homeHero}
            imageStyle={styles.homeHeroImage}
          >
            <LinearGradient
              colors={['rgba(145,12,19,0.82)', 'rgba(20,105,51,0.70)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <Tap onPress={toggleSound}><View style={styles.heroRound}><Text style={{fontSize:20}}>{soundOn ? '🔊' : '🔇'}</Text></View></Tap>
              <View style={styles.todayPill}><Text style={styles.todayText}>🔥 سلسلة اليوم</Text></View>
            </View>
            <PulseSun />
            <Text style={styles.heroBrand}>fêrî kurdî</Text>
            <Text style={styles.heroTag}>Ziman • Çand • Fêrbûn</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}><Text style={styles.heroStatNum}>{points}</Text><Text style={styles.heroStatLabel}>⭐ نقطة</Text></View>
              <View style={styles.heroStat}><Text style={styles.heroStatNum}>{completed.length}</Text><Text style={styles.heroStatLabel}>✅ درس</Text></View>
              <View style={styles.heroStat}><Text style={styles.heroStatNum}>{TOTAL_PHRASES}</Text><Text style={styles.heroStatLabel}>💬 جملة</Text></View>
            </View>
          </ImageBackground>

          <View style={styles.homeBody}>
            <View style={styles.dailyCard}>
              <View style={styles.dailyTextWrap}>
                <Text style={styles.dailyTitle}>جملة اليوم</Text>
                <Text style={styles.dailyKu}>{ALL_PHRASES[(new Date().getDate() * 7) % ALL_PHRASES.length].ku}</Text>
                <Text style={styles.dailyAr}>{ALL_PHRASES[(new Date().getDate() * 7) % ALL_PHRASES.length].ar}</Text>
              </View>
              <Tap onPress={() => speak(ALL_PHRASES[(new Date().getDate() * 7) % ALL_PHRASES.length].ku)}>
                <View style={styles.dailySound}><Text style={{fontSize:25}}>🔊</Text></View>
              </Tap>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}><Text style={styles.progressPercent}>{progress}%</Text><Text style={styles.progressTitle}>تقدمك في الدروس</Text></View>
              <ProgressBar value={progress} />
            </View>

            <View style={styles.culturalBand}>
              <GovendAnimation />
              <Text style={styles.culturalBandText}>حركة وثقافة وصوت… مو بس كلمات</Text>
            </View>

            {features.map(([target, emoji, title, subtitle, color], i) => (
              <FeatureCard
                key={target}
                delay={40 * i}
                emoji={emoji}
                title={title}
                subtitle={subtitle}
                color={color}
                onPress={() => { tap(); setScreen(target); }}
              />
            ))}

            <View style={styles.quoteCard}>
              <Text style={styles.quoteKu}>“Ziman nasnameya çandê ye.”</Text>
              <Text style={styles.quoteAr}>اللغة بوابة إلى الثقافة والذاكرة.</Text>
            </View>

            <Tap onPress={logout}><Text style={styles.logout}>تسجيل الخروج</Text></Tap>
            <Text style={styles.copyright}>© 2026 Abdulsamie Omar — جميع الحقوق محفوظة</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'alphabet') {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title="الأبجدية • Alfabê" onBack={goHome} soundOn={soundOn} onToggleSound={toggleSound} />
        <FlatList
          data={ALPHABET}
          numColumns={3}
          keyExtractor={(item, i) => `${item[0]}-${i}`}
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={<Text style={styles.pageIntro}>اضغط على الحرف لتسمع الكلمة. كل بطاقة فيها مثال ومعناه.</Text>}
          renderItem={({ item, index }) => (
            <Tap onPress={() => { tap(); speak(item[1]); }}>
              <LinearGradient
                colors={index % 3 === 0 ? ['#FFF0F1', '#FFFFFF'] : index % 3 === 1 ? ['#ECF8F0', '#FFFFFF'] : ['#FFF8D8', '#FFFFFF']}
                style={styles.alphaCard}
              >
                <Text style={styles.alphaLetter}>{item[0]}</Text>
                <Text style={styles.alphaWord}>{item[1]}</Text>
                <Text style={styles.alphaArabic}>{item[2]}</Text>
                <Text style={styles.alphaSound}>🔊</Text>
              </LinearGradient>
            </Tap>
          )}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'lessons' && !lesson) {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title="الدروس • Ders" onBack={goHome} soundOn={soundOn} onToggleSound={toggleSound} />
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.pagePad}
          ListHeaderComponent={<Text style={styles.pageIntro}>320 جملة موزعة على 16 موضوعاً، من الأساسيات إلى المحادثة والثقافة.</Text>}
          renderItem={({ item }) => (
            <Tap onPress={() => { tap(); setLessonId(item.id); }}>
              <View style={styles.lessonCat}>
                <View style={styles.lessonCheck}><Text style={{fontSize:18}}>{completed.includes(item.id) ? '✅' : `L${item.level}`}</Text></View>
                <View style={styles.lessonTextWrap}>
                  <Text style={styles.lessonTitle}>{item.title}</Text>
                  <Text style={styles.lessonSub}>{item.kuTitle} • {item.phrases.length} جملة</Text>
                </View>
                <View style={styles.lessonEmoji}><Text style={{fontSize:29}}>{item.emoji}</Text></View>
              </View>
            </Tap>
          )}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'lessons' && lesson) {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title={`${lesson.emoji} ${lesson.title}`} onBack={() => { tap(); setLessonId(null); }} soundOn={soundOn} onToggleSound={toggleSound} />
        <FlatList
          data={lesson.phrases}
          keyExtractor={(item, i) => `${item.ku}-${i}`}
          contentContainerStyle={styles.pagePad}
          ListHeaderComponent={
            <LinearGradient colors={[K.softYellow, '#FFFFFF']} style={styles.lessonHero}>
              <Text style={styles.lessonHeroEmoji}>{lesson.emoji}</Text>
              <Text style={styles.lessonHeroKu}>{lesson.kuTitle}</Text>
              <Text style={styles.lessonHeroAr}>{lesson.title} • المستوى {lesson.level}</Text>
            </LinearGradient>
          }
          renderItem={({ item, index }) => (
            <View style={styles.phraseCard}>
              <Tap onPress={() => speak(item.ku)}><View style={styles.soundSquare}><Text style={{fontSize:22}}>🔊</Text></View></Tap>
              <View style={styles.phraseTextWrap}>
                <Text style={styles.phraseKu}>{item.ku}</Text>
                <Text style={styles.phraseAr}>{item.ar}</Text>
              </View>
              <View style={styles.numberBubble}><Text style={styles.numberText}>{index + 1}</Text></View>
            </View>
          )}
          ListFooterComponent={
            <Tap onPress={() => completeLesson(lesson.id)}>
              <LinearGradient colors={completed.includes(lesson.id) ? ['#777','#666'] : [K.green, K.greenDark]} style={styles.finishBtn}>
                <Text style={styles.finishBtnText}>{completed.includes(lesson.id) ? '✅ الدرس مكتمل' : '🏆 أكملت الدرس +30 نقطة'}</Text>
              </LinearGradient>
            </Tap>
          }
        />
      </SafeAreaView>
    );
  }

  if (screen === 'dictionary') {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title="قاموس الجمل • Lêgerîn" onBack={goHome} soundOn={soundOn} onToggleSound={toggleSound} />
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث: Silav / مرحباً / السفر…"
            placeholderTextColor="#999"
            style={styles.searchInput}
            textAlign="right"
          />
          <Text style={styles.searchCount}>{filteredPhrases.length} نتيجة</Text>
        </View>
        <FlatList
          data={filteredPhrases}
          keyExtractor={(item, i) => `${item.ku}-${i}`}
          contentContainerStyle={styles.dictionaryList}
          renderItem={({ item }) => (
            <View style={styles.dictionaryCard}>
              <Tap onPress={() => speak(item.ku)}><View style={styles.soundSquare}><Text style={{fontSize:20}}>🔊</Text></View></Tap>
              <View style={styles.dictionaryText}>
                <Text style={styles.dictionaryKu}>{item.ku}</Text>
                <Text style={styles.dictionaryAr}>{item.ar}</Text>
                <Text style={styles.dictionaryCat}>{item.emoji} {item.category}</Text>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'conversation') {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title="المحادثات • Axaftin" onBack={goHome} soundOn={soundOn} onToggleSound={toggleSound} />
        <FlatList
          data={DIALOGUES}
          keyExtractor={(item, i) => `${item.title}-${i}`}
          contentContainerStyle={styles.pagePad}
          renderItem={({ item }) => (
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>{item.title}</Text>
              {item.lines.map((line, li) => {
                const left = line[0] === 'A';
                return (
                  <View key={li} style={[styles.bubbleRow, { justifyContent: left ? 'flex-start' : 'flex-end' }]}>
                    <Tap onPress={() => speak(line[1])}>
                      <View style={[styles.bubble, left ? styles.bubbleA : styles.bubbleB]}>
                        <Text style={styles.bubbleKu}>{line[1]}</Text>
                        <Text style={styles.bubbleAr}>{line[2]}</Text>
                        <Text style={styles.bubbleSound}>🔊</Text>
                      </View>
                    </Tap>
                  </View>
                );
              })}
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  if (screen === 'listening') {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title="الاستماع والنطق" onBack={goHome} soundOn={soundOn} onToggleSound={toggleSound} />
        <View style={styles.centerPage}>
          <Text style={styles.listenHint}>اسمع الجملة، حاول فهمها، ثم اكشف المعنى.</Text>
          <Tap onPress={() => speak(listening.ku)}>
            <LinearGradient colors={[K.green, K.greenDark]} style={styles.bigListenButton}>
              <Text style={styles.bigListenEmoji}>🎧</Text>
              <Text style={styles.bigListenText}>استمع</Text>
            </LinearGradient>
          </Tap>
          <View style={styles.listenCard}>
            <Text style={styles.listenKu}>{listening.ku}</Text>
            {revealed ? <Text style={styles.listenAr}>{listening.ar}</Text> : <Text style={styles.hiddenMeaning}>••••••••••</Text>}
            <Text style={styles.listenCat}>{listening.emoji} {listening.category}</Text>
          </View>
          <View style={styles.fullWidth}>
            <Tap onPress={() => { tap(); setRevealed((v) => !v); }}><View style={styles.outlineBtn}><Text style={styles.outlineBtnText}>{revealed ? 'إخفاء المعنى' : 'كشف المعنى'}</Text></View></Tap>
            <Tap onPress={() => { tap(); setListenIndex((i) => (i + 1) % ALL_PHRASES.length); setRevealed(false); }}><LinearGradient colors={[K.red, K.redDark]} style={styles.nextBtn}><Text style={styles.primaryBtnText}>جملة جديدة ←</Text></LinearGradient></Tap>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'culture') {
    return (
      <SafeAreaView style={styles.safe}>
        <BackHeader title="الثقافة الكوردية • Çand" onBack={goHome} soundOn={soundOn} onToggleSound={toggleSound} />
        <FlatList
          data={CULTURE_ITEMS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.pagePad}
          ListHeaderComponent={
            <View>
              <ImageBackground source={require('../assets/images/ferikurdi_banner.png')} style={styles.cultureBanner} imageStyle={styles.cultureBannerImage}>
                <LinearGradient colors={['rgba(0,0,0,0.08)','rgba(0,0,0,0.62)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.cultureBannerTitle}>Çanda Kurdî</Text>
