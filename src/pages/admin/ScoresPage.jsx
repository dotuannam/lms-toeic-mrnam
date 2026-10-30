import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { subscribeClasses } from "../../services/classService";
import { subscribeStudents } from "../../services/studentService";
import { saveBatchScores, calculateTotalScore, calculateRadarScale } from "../../services/scoreService";
import { ClassroomScoresSyncModal } from "../../components/admin/ClassroomScoresSyncModal";
import { RadarChart } from "../../components/charts/RadarChart";

export const ScoresPage = () => {
  const { t, lang } = useLanguage();
  const isVi = lang === "vi";

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [testType, setTestType] = useState("CUSTOM"); // "CUSTOM" | "TOEIC" | "IELTS" | "APTIS" | "VSTEP"
  const [testTitle, setTestTitle] = useState("Progress Test 01");
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0]);
  const [targetScore, setTargetScore] = useState("7.0");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [activeSkillForWeights, setActiveSkillForWeights] = useState(null);
  const [previewStudentForRadar, setPreviewStudentForRadar] = useState(null);

  // Entry Mode: "by_correct_count" (Nhập số câu đúng) vs "by_score" (Nhập điểm trực tiếp)
  const [entryMode, setEntryMode] = useState("by_correct_count");

  // Dynamic Skill / Section Configuration
  // Teacher has full control over questions, total points, points per question (bulk or custom)
  const [skillsConfig, setSkillsConfig] = useState([
    {
      id: "part_1",
      name: "Phần 1: Trắc nghiệm (Part 1)",
      questions: 20,
      maxScore: 5.0,
      pointsPerQuestion: 0.25,
      pointsMode: "equal", // "equal" | "custom"
      questionWeights: Array(20).fill(0.25),
    },
    {
      id: "part_2",
      name: "Phần 2: Tự luận / Viết (Part 2)",
      questions: 10,
      maxScore: 5.0,
      pointsPerQuestion: 0.5,
      pointsMode: "equal",
      questionWeights: Array(10).fill(0.5),
    },
  ]);

  // Student scores state: { [studentId]: { skills: { [skillId]: number }, rawCorrect: { [skillId]: number }, feedback: string } }
  const [studentScores, setStudentScores] = useState({});

  // 1. Subscribe to classes and students
  useEffect(() => {
    const unsubClasses = subscribeClasses((clsList) => {
      setClasses(clsList);
      if (clsList.length > 0 && !selectedClassId) {
        setSelectedClassId(clsList[0].classId);
        const type = clsList[0].courseType || "CUSTOM";
        applyPreset(type);
      }
    });

    const unsubStudents = subscribeStudents((stdList) => {
      setStudents(stdList);
    });

    return () => {
      unsubClasses();
      unsubStudents();
    };
  }, []);

  // Preset Configurations with editable scales
  const applyPreset = (type) => {
    setTestType(type);
    if (type === "TOEIC") {
      setSkillsConfig([
        {
          id: "listening",
          name: "Listening",
          questions: 50,
          maxScore: 495,
          pointsPerQuestion: 9.9,
          pointsMode: "equal",
          questionWeights: Array(50).fill(9.9),
        },
        {
          id: "reading",
          name: "Reading",
          questions: 50,
          maxScore: 495,
          pointsPerQuestion: 9.9,
          pointsMode: "equal",
          questionWeights: Array(50).fill(9.9),
        },
      ]);
      setTargetScore("550");
    } else if (type === "IELTS") {
      setSkillsConfig([
        {
          id: "listening",
          name: "Listening",
          questions: 40,
          maxScore: 9.0,
          pointsPerQuestion: 0.225,
          pointsMode: "equal",
          questionWeights: Array(40).fill(0.225),
        },
        {
          id: "reading",
          name: "Reading",
          questions: 40,
          maxScore: 9.0,
          pointsPerQuestion: 0.225,
          pointsMode: "equal",
          questionWeights: Array(40).fill(0.225),
        },
        {
          id: "writing",
          name: "Writing",
          questions: 2,
          maxScore: 9.0,
          pointsPerQuestion: 4.5,
          pointsMode: "equal",
          questionWeights: [3.0, 6.0],
        },
        {
          id: "speaking",
          name: "Speaking",
          questions: 3,
          maxScore: 9.0,
          pointsPerQuestion: 3.0,
          pointsMode: "equal",
          questionWeights: Array(3).fill(3.0),
        },
      ]);
      setTargetScore("6.5");
    } else if (type === "APTIS") {
      setSkillsConfig([
        { id: "grammar_vocab", name: "Grammar & Vocab", questions: 50, maxScore: 50, pointsPerQuestion: 1, pointsMode: "equal", questionWeights: Array(50).fill(1) },
        { id: "listening", name: "Listening", questions: 25, maxScore: 50, pointsPerQuestion: 2, pointsMode: "equal", questionWeights: Array(25).fill(2) },
        { id: "reading", name: "Reading", questions: 25, maxScore: 50, pointsPerQuestion: 2, pointsMode: "equal", questionWeights: Array(25).fill(2) },
        { id: "speaking", name: "Speaking", questions: 4, maxScore: 50, pointsPerQuestion: 12.5, pointsMode: "equal", questionWeights: Array(4).fill(12.5) },
        { id: "writing", name: "Writing", questions: 4, maxScore: 50, pointsPerQuestion: 12.5, pointsMode: "equal", questionWeights: Array(4).fill(12.5) },
      ]);
      setTargetScore("140");
    } else if (type === "VSTEP") {
      setSkillsConfig([
        { id: "listening", name: "Listening", questions: 35, maxScore: 10, pointsPerQuestion: 0.28, pointsMode: "equal", questionWeights: Array(35).fill(0.28) },
        { id: "reading", name: "Reading", questions: 40, maxScore: 10, pointsPerQuestion: 0.25, pointsMode: "equal", questionWeights: Array(40).fill(0.25) },
        { id: "writing", name: "Writing", questions: 2, maxScore: 10, pointsPerQuestion: 5.0, pointsMode: "equal", questionWeights: [3.3, 6.7] },
        { id: "speaking", name: "Speaking", questions: 3, maxScore: 10, pointsPerQuestion: 3.33, pointsMode: "equal", questionWeights: Array(3).fill(3.33) },
      ]);
      setTargetScore("6.0");
    } else {
      // Custom Quiz / Test
      setSkillsConfig([
        {
          id: "part_1",
          name: "Phần 1: Trắc nghiệm (Part 1)",
          questions: 20,
          maxScore: 5.0,
          pointsPerQuestion: 0.25,
          pointsMode: "equal",
          questionWeights: Array(20).fill(0.25),
        },
        {
          id: "part_2",
          name: "Phần 2: Tự luận / Viết (Part 2)",
          questions: 10,
          maxScore: 5.0,
          pointsPerQuestion: 0.5,
          pointsMode: "equal",
          questionWeights: Array(10).fill(0.5),
        },
      ]);
      setTargetScore("7.0");
    }
  };

  const handleClassChange = (newClassId) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.classId === newClassId);
    if (cls) {
      const type = cls.courseType || "CUSTOM";
      applyPreset(type);
    }
  };

  const classStudents = students.filter((s) =>
    s.currentClassIds?.includes(selectedClassId)
  );

  const selectedClass = classes.find((c) => c.classId === selectedClassId);

  // Overall Test Totals
  const totalQuestions = useMemo(
    () => skillsConfig.reduce((acc, s) => acc + (Number(s.questions) || 0), 0),
    [skillsConfig]
  );

  const totalPossibleScore = useMemo(
    () =>
      testType === "IELTS"
        ? 9.0
        : Math.round(skillsConfig.reduce((acc, s) => acc + (Number(s.maxScore) || 0), 0) * 100) / 100,
    [skillsConfig, testType]
  );

  // 2. Score entry handlers
  const handleCorrectCountChange = (studentId, skillId, count) => {
    const rawVal = count === "" ? "" : Math.max(0, Number(count) || 0);
    const skill = skillsConfig.find((s) => s.id === skillId);
    const maxQ = skill?.questions || 0;
    const clampedCount = count === "" ? "" : Math.min(maxQ, rawVal);

    // Compute earned points from correct count
    let earnedPoints = 0;
    if (clampedCount !== "") {
      if (skill?.pointsMode === "custom" && Array.isArray(skill.questionWeights) && skill.questionWeights.length > 0) {
        // Sum weights of the first N correct questions
        earnedPoints = skill.questionWeights
          .slice(0, Math.min(skill.questionWeights.length, Number(clampedCount)))
          .reduce((a, b) => a + Number(b || 0), 0);
      } else {
        earnedPoints = Math.round(Number(clampedCount) * (Number(skill?.pointsPerQuestion) || 0) * 100) / 100;
      }
      earnedPoints = Math.min(skill?.maxScore || 10, earnedPoints);
    }

    setStudentScores((prev) => {
      const current = prev[studentId] || { skills: {}, rawCorrect: {}, feedback: "" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          rawCorrect: {
            ...current.rawCorrect,
            [skillId]: clampedCount,
          },
          skills: {
            ...current.skills,
            [skillId]: clampedCount === "" ? "" : earnedPoints,
          },
        },
      };
    });
  };

  const handleDirectScoreChange = (studentId, skillId, score) => {
    const skill = skillsConfig.find((s) => s.id === skillId);
    const maxS = skill?.maxScore || 10;
    const scoreVal = score === "" ? "" : Math.min(maxS, Math.max(0, Number(score) || 0));

    // Approximate correct questions if pointsPerQuestion is known
    let estCorrect = "";
    if (scoreVal !== "" && skill?.pointsPerQuestion > 0) {
      estCorrect = Math.min(skill.questions, Math.round(scoreVal / skill.pointsPerQuestion));
    }

    setStudentScores((prev) => {
      const current = prev[studentId] || { skills: {}, rawCorrect: {}, feedback: "" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          skills: {
            ...current.skills,
            [skillId]: scoreVal,
          },
          rawCorrect: {
            ...current.rawCorrect,
            [skillId]: estCorrect,
          },
        },
      };
    });
  };

  const updateFeedback = (studentId, feedback) => {
    setStudentScores((prev) => {
      const current = prev[studentId] || { skills: {}, rawCorrect: {}, feedback: "" };
      return {
        ...prev,
        [studentId]: {
          ...current,
          feedback,
        },
      };
    });
  };

  // Helper to get student's computed score and percentage
  const getStudentMetrics = (studentId) => {
    const studentData = studentScores[studentId] || {};
    const skills = studentData.skills || {};

    const totalEarned = calculateTotalScore(
      testType,
      skills,
      "custom_flexible",
      { skillsConfig, scoringAggregation: testType === "IELTS" ? "average_round_half" : "sum" }
    );

    const percentage =
      totalPossibleScore > 0
        ? Math.min(100, Math.max(0, Math.round((totalEarned / totalPossibleScore) * 100)))
        : 0;

    const isPassed = totalEarned >= (Number(targetScore) || 0);

    return { totalEarned, percentage, isPassed };
  };

  // 3. Quick Action: Bulk fill maximum score or clear
  const handleBulkFillMax = () => {
    if (!window.confirm(isVi ? "Bạn có chắc chắn muốn điền điểm tối đa cho tất cả học viên trong lớp?" : "Fill max score for all students?")) return;
    setStudentScores((prev) => {
      const next = { ...prev };
      classStudents.forEach((st) => {
        const skills = {};
        const rawCorrect = {};
        skillsConfig.forEach((sk) => {
          skills[sk.id] = sk.maxScore;
          rawCorrect[sk.id] = sk.questions;
        });
        next[st.studentId] = {
          skills,
          rawCorrect,
          feedback: next[st.studentId]?.feedback || "Xuất sắc! Đạt điểm tuyệt đối.",
        };
      });
      return next;
    });
  };

  const handleClearDraft = () => {
    if (!window.confirm(isVi ? "Xóa toàn bộ điểm đang nhập trên bảng?" : "Clear all entered scores?")) return;
    setStudentScores({});
  };

  // 4. Save batch scores to Firestore
  const handleSaveScores = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const gradingConfig = {
        totalQuestions,
        totalScore: totalPossibleScore,
        targetScore: Number(targetScore) || 0,
        skillsConfig,
        entryMode,
        scoringAggregation: testType === "IELTS" ? "average_round_half" : "sum",
      };

      const entries = classStudents.map((st) => {
        const studentData = studentScores[st.studentId] || {};
        const rawSkills = studentData.skills || {};
        const total = calculateTotalScore(testType, rawSkills, "custom_flexible", gradingConfig);

        return {
          studentId: st.studentId,
          studentName: st.fullName,
          skills: rawSkills,
          correctCount: Object.values(studentData.rawCorrect || {}).reduce((a, b) => a + (Number(b) || 0), 0),
          totalScore: total,
          feedback: studentData.feedback || "",
        };
      });

      await saveBatchScores({
        classId: selectedClassId,
        testTitle,
        testType,
        gradingMode: "custom_flexible",
        config: gradingConfig,
        testDate,
        targetScore: Number(targetScore) || 0,
        entries,
      });

      setMessage(
        isVi
          ? "Đã lưu toàn bộ điểm thi thành công! Tỷ lệ phần trăm và biểu đồ Radar Chart của học viên đã được cập nhật."
          : "Scores recorded and student Radar Chart profiles updated!"
      );
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      alert("Failed to save scores: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Classroom Scores Sync Callback
  const handleApplyClassroomScores = ({ testTitle: newTitle, scoresToUpdate, matchedCount }) => {
    if (newTitle) setTestTitle(newTitle);
    setStudentScores((prev) => {
      const next = { ...prev };
      Object.keys(scoresToUpdate).forEach((stdId) => {
        const incoming = scoresToUpdate[stdId];
        const prevStd = next[stdId] || { skills: {}, rawCorrect: {}, feedback: "" };
        const mergedSkills = { ...prevStd.skills, ...(incoming.skills || {}) };

        // Auto compute raw correct count
        const mergedCorrect = { ...prevStd.rawCorrect };
        Object.keys(incoming.skills || {}).forEach((skId) => {
          const skConf = skillsConfig.find((s) => s.id === skId);
          if (skConf && skConf.pointsPerQuestion > 0) {
            mergedCorrect[skId] = Math.min(skConf.questions, Math.round(incoming.skills[skId] / skConf.pointsPerQuestion));
          }
        });

        next[stdId] = {
          ...prevStd,
          skills: mergedSkills,
          rawCorrect: mergedCorrect,
          feedback: incoming.feedback || prevStd.feedback,
        };
      });
      return next;
    });

    setMessage(
      isVi
        ? `Đã đồng bộ thành công cho ${matchedCount} học viên từ Google Classroom: "${newTitle}"!`
        : `Successfully populated grades for ${matchedCount} students from Google Classroom: "${newTitle}"!`
    );
    setTimeout(() => setMessage(""), 5000);
  };

  // Skill Management inside Drawer/Config
  const handleAddSkill = () => {
    const nextNum = skillsConfig.length + 1;
    const newSkill = {
      id: `skill_${Date.now().toString().slice(-4)}`,
      name: `Kỹ năng / Phần thi ${nextNum}`,
      questions: 10,
      maxScore: 5.0,
      pointsPerQuestion: 0.5,
      pointsMode: "equal",
      questionWeights: Array(10).fill(0.5),
    };
    setSkillsConfig([...skillsConfig, newSkill]);
  };

  const handleUpdateSkill = (skillId, field, value) => {
    setSkillsConfig((prev) =>
      prev.map((sk) => {
        if (sk.id !== skillId) return sk;
        const updated = { ...sk, [field]: value };

        // If questions changed, adjust questionWeights length
        if (field === "questions") {
          const newQ = Math.max(1, parseInt(value, 10) || 1);
          updated.questions = newQ;
          const currentWeights = Array.isArray(sk.questionWeights) ? sk.questionWeights : [];
          if (newQ > currentWeights.length) {
            const added = Array(newQ - currentWeights.length).fill(sk.pointsPerQuestion || 0.5);
            updated.questionWeights = [...currentWeights, ...added];
          } else {
            updated.questionWeights = currentWeights.slice(0, newQ);
          }
          if (sk.pointsMode === "equal") {
            updated.pointsPerQuestion = Math.round(((sk.maxScore || 10) / newQ) * 100) / 100;
            updated.questionWeights = Array(newQ).fill(updated.pointsPerQuestion);
          }
        }

        // If maxScore changed and equal distribution
        if (field === "maxScore") {
          const newMax = Math.max(0.1, Number(value) || 0.1);
          updated.maxScore = newMax;
          if (sk.pointsMode === "equal" && sk.questions > 0) {
            updated.pointsPerQuestion = Math.round((newMax / sk.questions) * 100) / 100;
            updated.questionWeights = Array(sk.questions).fill(updated.pointsPerQuestion);
          }
        }

        // If pointsPerQuestion changed
        if (field === "pointsPerQuestion") {
          const newP = Number(value) || 0;
          updated.pointsPerQuestion = newP;
          updated.questionWeights = Array(sk.questions).fill(newP);
          updated.maxScore = Math.round(newP * sk.questions * 100) / 100;
        }

        return updated;
      })
    );
  };

  const handleRemoveSkill = (skillId) => {
    if (skillsConfig.length <= 1) {
      alert(isVi ? "Bài kiểm tra cần có ít nhất 1 phần thi/kỹ năng." : "Assessment must have at least 1 section.");
      return;
    }
    setSkillsConfig(skillsConfig.filter((s) => s.id !== skillId));
  };

  // Open Question Weights Configuration Modal
  const handleOpenWeightsModal = (skill) => {
    setActiveSkillForWeights(skill || skillsConfig[0]);
    setShowWeightsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card: Test Setup & Teacher Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("classLabel")}
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            >
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Test Preset / Format */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("testTypeLabel")}
            </label>
            <select
              value={testType}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            >
              <option value="CUSTOM">{isVi ? "Tùy chỉnh (Đề thi tự do)" : "Custom Test / Quiz"}</option>
              <option value="TOEIC">TOEIC (Listening & Reading)</option>
              <option value="IELTS">IELTS (4 Kỹ năng)</option>
              <option value="APTIS">APTIS (5 Components)</option>
              <option value="VSTEP">VSTEP (4 Kỹ năng)</option>
            </select>
          </div>

          {/* Test Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("testTitleLabel")}
            </label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="e.g. Midterm Evaluation"
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            />
          </div>

          {/* Test Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("sessionDate") || "Ngày kiểm tra"}
            </label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            />
          </div>

          {/* Target Passing Score */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              {t("targetScoreLabel")}
            </label>
            <input
              type="number"
              step="any"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              placeholder="e.g. 7.0"
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-[#c27803] focus:outline-none focus:ring-2 focus:ring-[#c27803]/20 focus:border-[#c27803]"
            />
          </div>
        </div>

        {/* 2. Interactive Grading Scale Overview Strip */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#c27803] text-white text-xs">⚖️</span>
              <div>
                <div className="text-xs font-bold text-[#261e16] uppercase tracking-wide">
                  {t("scoreGradingConfig") || "Cấu hình thang điểm & Đề thi"}
                </div>
                <div className="text-[11px] text-slate-600">
                  {t("radarPercentageApplied") || "Tỷ lệ phần trăm (%) được tính tự động và hiển thị trên Radar Chart"}
                </div>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 font-bold text-slate-700 shadow-2xs">
                {t("totalQuestions")}: <span className="text-[#c27803]">{totalQuestions}</span> câu
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 font-bold text-slate-700 shadow-2xs">
                {t("totalPoints")}: <span className="text-[#c27803]">{totalPossibleScore}</span> điểm
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 font-bold text-slate-700 shadow-2xs">
                {skillsConfig.length} {isVi ? "phần thi / kỹ năng" : "sections"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Open Test Structure Drawer */}
            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <span>⚙️</span>
              <span>{showConfigDrawer ? (isVi ? "Thu gọn cấu hình" : "Hide Config") : (isVi ? "Tùy biến câu hỏi & Điểm" : "Customize Questions & Points")}</span>
            </button>

            {/* Open Question Weights Modal */}
            <button
              type="button"
              onClick={() => handleOpenWeightsModal(skillsConfig[0])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <span>📝</span>
              <span>{t("customPerQuestion") || "Tùy chọn từng câu / Hàng loạt"}</span>
            </button>

            {/* Google Classroom Sync Button */}
            <button
              type="button"
              onClick={() => setShowClassroomModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <span>⚡</span>
              <span>{t("syncClassroomGradesBtn")}</span>
            </button>
          </div>
        </div>

        {/* 3. Expandable Section Configuration Panel */}
        {showConfigDrawer && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 transition-all animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {t("customGradingTitle") || "Toàn quyền quyết định số câu & Thang điểm"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {t("customGradingDesc") || "Tùy biến số câu, tổng điểm, cấu hình điểm từng câu hàng loạt hoặc chi tiết theo từng kỹ năng"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-[#c27803] border border-[#c27803]/30 rounded-lg text-xs font-bold transition"
              >
                {t("addSkillSection") || "+ Thêm phần thi"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {skillsConfig.map((sk, idx) => (
                <div
                  key={sk.id}
                  className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs relative"
                >
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={sk.name}
                      onChange={(e) => handleUpdateSkill(sk.id, "name", e.target.value)}
                      className="font-bold text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#c27803] focus:outline-none w-full"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(sk.id)}
                      title="Xóa phần thi"
                      className="text-slate-400 hover:text-rose-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">{t("questionCount") || "Số câu"}</label>
                      <input
                        type="number"
                        min="1"
                        value={sk.questions}
                        onChange={(e) => handleUpdateSkill(sk.id, "questions", e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">{t("maxPoints") || "Điểm tối đa"}</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={sk.maxScore}
                        onChange={(e) => handleUpdateSkill(sk.id, "maxScore", e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block">{t("pointsPerQuestion") || "Điểm/câu"}</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={sk.pointsPerQuestion}
                        onChange={(e) => handleUpdateSkill(sk.id, "pointsPerQuestion", e.target.value)}
                        className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-center text-[#c27803]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <span className="font-mono">
                      {sk.pointsMode === "custom" ? (isVi ? "Tùy biến từng câu" : "Custom weights") : `${sk.questions} × ${sk.pointsPerQuestion}đ`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenWeightsModal(sk)}
                      className="text-[#c27803] font-bold hover:underline"
                    >
                      {isVi ? "Sửa điểm câu →" : "Edit points →"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {/* 4. Score Entry Table & Teacher Fast Controls */}
      <form onSubmit={handleSaveScores}>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Table Action Strip */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Mode Switcher: By Correct Answers vs By Direct Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {isVi ? "Chế độ nhập:" : "Entry Mode:"}
              </span>
              <div className="inline-flex rounded-xl p-1 bg-white border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setEntryMode("by_correct_count")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    entryMode === "by_correct_count"
                      ? "bg-[#c27803] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✓ {t("entryModeByCorrect") || "Nhập số câu đúng"}
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode("by_score")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    entryMode === "by_score"
                      ? "bg-[#c27803] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🎯 {t("entryModeByScore") || "Nhập điểm số"}
                </button>
              </div>
            </div>

            {/* Batch Helpers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkFillMax}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
              >
                💯 {isVi ? "Điền điểm tối đa cho cả lớp" : "Fill Max Score"}
              </button>
              <button
                type="button"
                onClick={handleClearDraft}
                className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition"
              >
                🗑️ {isVi ? "Xóa bảng" : "Clear"}
              </button>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="font-semibold text-slate-700">{isVi ? "Chưa có học viên nào trong lớp này" : "No students enrolled in this class"}</p>
              <p className="text-xs text-slate-400 mt-1">{isVi ? "Vui lòng ghi danh học viên vào lớp trước." : "Enroll students into this class first."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4 min-w-[180px]">{isVi ? "Học viên" : "Student"}</th>

                    {/* Dynamic Skill Columns Configured by Teacher */}
                    {skillsConfig.map((sk) => (
                      <th key={sk.id} className="py-3 px-3 text-center min-w-[130px]">
                        <div className="font-bold text-slate-800">{sk.name}</div>
                        <div className="text-[10px] font-normal text-slate-400 lowercase">
                          {entryMode === "by_correct_count"
                            ? `${sk.questions} câu (Max ${sk.maxScore}đ)`
                            : `Max ${sk.maxScore}đ`}
                        </div>
                      </th>
                    ))}

                    <th className="py-3 px-4 text-center min-w-[110px]">
                      <div>{t("overallScore") || "Tổng điểm"}</div>
                      <div className="text-[10px] font-normal text-slate-400 lowercase">
                        / {totalPossibleScore}đ
                      </div>
                    </th>

                    <th className="py-3 px-3 text-center min-w-[90px]">
                      {t("percentageScore") || "Tỷ lệ (%)"}
                    </th>

                    <th className="py-3 px-2 text-center min-w-[70px]">
                      Radar
                    </th>

                    <th className="py-3 px-4 min-w-[200px]">
                      {t("instructorFeedback") || "Nhận xét của giảng viên"}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st) => {
                    const studentData = studentScores[st.studentId] || {};
                    const { totalEarned, percentage, isPassed } = getStudentMetrics(st.studentId);

                    return (
                      <tr key={st.studentId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{st.fullName}</div>
                          <div className="text-xs font-mono font-medium text-slate-400">{st.studentId}</div>
                        </td>

                        {/* Dynamic Skill Inputs */}
                        {skillsConfig.map((sk) => {
                          const rawCount = studentData.rawCorrect?.[sk.id] ?? "";
                          const scoreVal = studentData.skills?.[sk.id] ?? "";

                          return (
                            <td key={sk.id} className="py-3 px-3 text-center">
                              {entryMode === "by_correct_count" ? (
                                <div className="inline-flex flex-col items-center">
                                  <div className="relative inline-block">
                                    <input
                                      type="number"
                                      min="0"
                                      max={sk.questions}
                                      placeholder="0"
                                      value={rawCount}
                                      onChange={(e) => handleCorrectCountChange(st.studentId, sk.id, e.target.value)}
                                      className="w-16 text-center py-1.5 px-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/30 focus:border-[#c27803]"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 ml-1">/{sk.questions}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-[#c27803] mt-0.5">
                                    {scoreVal !== "" ? `${scoreVal}đ` : "--"}
                                  </span>
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={sk.maxScore}
                                    step="any"
                                    placeholder="0"
                                    value={scoreVal}
                                    onChange={(e) => handleDirectScoreChange(st.studentId, sk.id, e.target.value)}
                                    className="w-18 text-center py-1.5 px-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c27803]/30 focus:border-[#c27803]"
                                  />
                                  <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                                    {scoreVal !== "" && sk.maxScore > 0 ? `${Math.round((scoreVal / sk.maxScore) * 100)}%` : "--"}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Overall Earned Score */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                              isPassed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {totalEarned} / {totalPossibleScore}
                          </span>
                        </td>

                        {/* Percentage Badge */}
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              percentage >= 70
                                ? "bg-emerald-100/70 text-emerald-800"
                                : percentage >= 50
                                ? "bg-amber-100/70 text-amber-800"
                                : "bg-rose-100/70 text-rose-800"
                            }`}
                          >
                            {percentage}%
                          </span>
                        </td>

                        {/* Radar Chart Quick Preview Trigger */}
                        <td className="py-3.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setPreviewStudentForRadar(st)}
                            title="Xem trước biểu đồ Radar Chart"
                            className="p-1.5 text-slate-400 hover:text-[#c27803] hover:bg-[#c27803]/10 rounded-lg transition"
                          >
                            🕸️
                          </button>
                        </td>

                        {/* Feedback */}
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            placeholder={isVi ? "Nhận xét, khuyến nghị cho học viên..." : "Add recommendations..."}
                            value={studentData.feedback || ""}
                            onChange={(e) => updateFeedback(st.studentId, e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#c27803]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {classStudents.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                {classStudents.length} {isVi ? "học viên sẵn sàng ghi nhận điểm & cập nhật Radar Chart" : "students queued for score commit"}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="py-2.5 px-6 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-heading font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-50 active:translate-y-px"
              >
                {submitting ? t("saving") : (t("saveScores") || "Lưu Điểm Thi")}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* 5. Question Point Weights Configuration Modal (Tùy chọn từng câu & Hàng loạt) */}
      {showWeightsModal && activeSkillForWeights && (
        <QuestionWeightsModal
          isOpen={showWeightsModal}
          onClose={() => setShowWeightsModal(false)}
          skill={activeSkillForWeights}
          onSave={(updatedSkill) => {
            setSkillsConfig((prev) =>
              prev.map((s) => (s.id === updatedSkill.id ? updatedSkill : s))
            );
            setShowWeightsModal(false);
            setMessage(t("questionWeightsSaved") || "Đã lưu cấu hình điểm từng câu thành công!");
            setTimeout(() => setMessage(""), 4000);
          }}
        />
      )}

      {/* 6. Radar Chart Preview Modal */}
      {previewStudentForRadar && (
        <RadarChartPreviewModal
          student={previewStudentForRadar}
          skillsConfig={skillsConfig}
          studentScores={studentScores[previewStudentForRadar.studentId]}
          testType={testType}
          testTitle={testTitle}
          totalPossibleScore={totalPossibleScore}
          onClose={() => setPreviewStudentForRadar(null)}
        />
      )}

      {/* 7. Google Classroom Scores Sync Modal */}
      <ClassroomScoresSyncModal
        isOpen={showClassroomModal}
        onClose={() => setShowClassroomModal(false)}
        selectedClass={selectedClass}
        classStudents={classStudents}
        testType={testType}
        skillsConfig={skillsConfig}
        onApplyScores={handleApplyClassroomScores}
      />
    </div>
  );
};

/**
 * Question Point Weights Modal: Full control over points per question (bulk or custom)
 */
const QuestionWeightsModal = ({ isOpen, onClose, skill, onSave }) => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const [questions, setQuestions] = useState(skill.questions || 10);
  const [weights, setWeights] = useState(() => {
    const existing = Array.isArray(skill.questionWeights) ? skill.questionWeights : [];
    if (existing.length === skill.questions) return [...existing];
    return Array(skill.questions).fill(skill.pointsPerQuestion || 0.5);
  });
  const [bulkVal, setBulkVal] = useState("0.5");
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState(String(skill.questions));
  const [rangeVal, setRangeVal] = useState("0.5");
  const [targetTotal, setTargetTotal] = useState(String(skill.maxScore || 10));

  const currentTotal = Math.round(weights.reduce((a, b) => a + (Number(b) || 0), 0) * 100) / 100;

  // Handle individual question change
  const handleWeightChange = (index, val) => {
    const num = Math.max(0, Number(val) || 0);
    const next = [...weights];
    next[index] = num;
    setWeights(next);
  };

  // Bulk: Apply to all questions
  const handleApplyAll = () => {
    const num = Math.max(0, Number(bulkVal) || 0);
    setWeights(Array(questions).fill(num));
  };

  // Bulk: Apply to question range
  const handleApplyRange = () => {
    const from = Math.max(1, parseInt(rangeFrom, 10) || 1) - 1;
    const to = Math.min(questions, parseInt(rangeTo, 10) || questions) - 1;
    const val = Math.max(0, Number(rangeVal) || 0);

    const next = [...weights];
    for (let i = from; i <= to; i++) {
      next[i] = val;
    }
    setWeights(next);
  };

  // Bulk: Auto-distribute target score equally
  const handleAutoDistribute = () => {
    const target = Math.max(0.1, Number(targetTotal) || 10);
    const perQ = Math.round((target / questions) * 100) / 100;
    setWeights(Array(questions).fill(perQ));
  };

  const handleSave = () => {
    onSave({
      ...skill,
      questions,
      maxScore: currentTotal,
      pointsPerQuestion: Math.round((currentTotal / (questions || 1)) * 100) / 100,
      pointsMode: "custom",
      questionWeights: weights,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isVi ? `Cấu hình điểm từng câu: ${skill.name}` : `Question Point Weights: ${skill.name}`}
            </h3>
            <p className="text-xs text-slate-500">
              {isVi
                ? "Thiết lập điểm từng câu tùy chọn hoặc dùng bộ công cụ hàng loạt để chia điểm tự động"
                : "Customize points per question individually or use bulk distribution tools"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Summary Metric Card */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950">
              {isVi ? "Tổng số câu:" : "Total Questions:"} <span className="font-mono text-[#c27803]">{questions}</span>
            </span>
            <span className="text-xs font-bold text-amber-950">
              {isVi ? "Tổng điểm thực tế:" : "Actual Total Points:"}{" "}
              <span className="font-mono text-base text-[#c27803]">{currentTotal}</span> đ
            </span>
          </div>

          {/* Bulk Tools Toolbar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {isVi ? "Bộ công cụ thiết lập Hàng loạt:" : "Bulk Tools:"}
            </div>

            {/* Tool 1: Apply to all */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-slate-600">{isVi ? "Gán tất cả thành:" : "Set all to:"}</span>
              <input
                type="number"
                step="any"
                value={bulkVal}
                onChange={(e) => setBulkVal(e.target.value)}
                className="w-18 p-1 bg-white border border-slate-300 rounded text-center font-bold"
              />
              <span className="text-slate-500">đ/câu</span>
              <button
                type="button"
                onClick={handleApplyAll}
                className="px-3 py-1 bg-slate-800 hover:bg-black text-white rounded text-xs font-bold transition"
              >
                {isVi ? "Áp dụng tất cả" : "Apply All"}
              </button>
            </div>

            {/* Tool 2: Apply to range */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200">
              <span className="font-medium text-slate-600">{isVi ? "Gán dải từ câu" : "Range from Q"}</span>
              <input
                type="number"
                min="1"
                max={questions}
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="w-14 p-1 bg-white border border-slate-300 rounded text-center"
              />
              <span className="text-slate-600">{isVi ? "đến câu" : "to Q"}</span>
              <input
                type="number"
                min="1"
                max={questions}
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="w-14 p-1 bg-white border border-slate-300 rounded text-center"
              />
              <span className="text-slate-600">{isVi ? "thành:" : "to:"}</span>
              <input
                type="number"
                step="any"
                value={rangeVal}
                onChange={(e) => setRangeVal(e.target.value)}
                className="w-16 p-1 bg-white border border-slate-300 rounded text-center font-bold"
              />
              <span className="text-slate-500">đ</span>
              <button
                type="button"
                onClick={handleApplyRange}
                className="px-3 py-1 bg-[#c27803] hover:bg-[#92400e] text-white rounded text-xs font-bold transition"
              >
                {isVi ? "Gán dải câu" : "Apply Range"}
              </button>
            </div>

            {/* Tool 3: Distribute Target Score */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-200">
              <span className="font-medium text-slate-600">{isVi ? "Chia đều từ Tổng điểm:" : "Distribute from Total:"}</span>
              <input
                type="number"
                step="any"
                value={targetTotal}
                onChange={(e) => setTargetTotal(e.target.value)}
                className="w-20 p-1 bg-white border border-slate-300 rounded text-center font-bold text-[#c27803]"
              />
              <span className="text-slate-500">đ</span>
              <button
                type="button"
                onClick={handleAutoDistribute}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
              >
                {isVi ? "Tự động chia đều" : "Auto Distribute"}
              </button>
            </div>
          </div>

          {/* Question Point Grid (Individual questions) */}
          <div>
            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isVi ? "Chi tiết điểm từng câu (Tùy chọn):" : "Custom Point Weights by Question:"}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-60 overflow-y-auto p-1">
              {weights.map((w, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-1 text-xs"
                >
                  <span className="font-bold text-slate-500">C.{idx + 1}</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={w}
                    onChange={(e) => handleWeightChange(idx, e.target.value)}
                    className="w-16 p-1 bg-white border border-slate-300 rounded text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#c27803]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-600">
            {isVi ? "Tổng điểm sau lưu:" : "Resulting Max Score:"}{" "}
            <strong className="text-[#c27803]">{currentTotal}đ</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              {isVi ? "Hủy" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#c27803] hover:bg-[#92400e] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
            >
              {isVi ? "Lưu cấu hình" : "Save Weights"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Radar Chart Preview Modal: Allows teacher to immediately preview the student's normalized radar chart
 */
const RadarChartPreviewModal = ({
  student,
  skillsConfig,
  studentScores = {},
  testType,
  testTitle,
  totalPossibleScore,
  onClose,
}) => {
  const { lang } = useLanguage();
  const isVi = lang === "vi";

  const rawSkills = studentScores.skills || {};
  const normalizedRadar = calculateRadarScale(
    testType,
    rawSkills,
    "custom_flexible",
    { skillsConfig, totalScore: totalPossibleScore }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isVi ? "Xem trước Radar Chart" : "Radar Chart Preview"}
            </h3>
            <p className="text-xs text-slate-500">
              {student.fullName} ({student.studentId}) &bull; {testTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col items-center justify-center">
          <RadarChart
            normalizedData={normalizedRadar}
            rawData={rawSkills}
            testType={testType}
            size={300}
          />

          <div className="mt-4 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="font-bold text-slate-700">{isVi ? "Chi tiết % quy đổi kỹ năng:" : "Percentage Breakdown:"}</div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(normalizedRadar).map(([skill, pct]) => (
                <div key={skill} className="flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-slate-100">
                  <span className="text-slate-600 truncate">{skill}:</span>
                  <span className="font-bold text-[#c27803]">{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-bold transition"
          >
            {isVi ? "Đóng xem trước" : "Close Preview"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoresPage;
