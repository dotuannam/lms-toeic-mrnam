import React, { createContext, useContext, useState, useEffect } from "react";
import {
  subscribeCenterConfig,
  subscribeBankingConfig,
  subscribeTeachingShifts,
  subscribeGasConfig,
  subscribeAnnouncementConfig,
  subscribeClassroomRules,
  subscribeLandingPageContent,
  saveCenterConfig,
  saveBankingConfig,
  saveTeachingShifts,
  saveGasConfig,
  saveAnnouncementConfig,
  saveClassroomRules,
  saveLandingPageContent,
  DEFAULT_CENTER_CONFIG,
  DEFAULT_BANKING_CONFIG,
  DEFAULT_SHIFTS,
  DEFAULT_GAS_CONFIG,
  DEFAULT_ANNOUNCEMENT_CONFIG,
  DEFAULT_CLASSROOM_RULES,
  DEFAULT_LANDING_PAGE_CONTENT,
  buildDynamicVietQrUrl,
} from "../services/settingsService";

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [centerConfig, setCenterConfig] = useState(DEFAULT_CENTER_CONFIG);
  const [bankingConfig, setBankingConfig] = useState(DEFAULT_BANKING_CONFIG);
  const [teachingShifts, setTeachingShifts] = useState(DEFAULT_SHIFTS);
  const [gasConfig, setGasConfig] = useState(DEFAULT_GAS_CONFIG);
  const [announcementConfig, setAnnouncementConfig] = useState(DEFAULT_ANNOUNCEMENT_CONFIG);
  const [classroomRules, setClassroomRules] = useState(DEFAULT_CLASSROOM_RULES);
  const [landingPageContent, setLandingPageContent] = useState(DEFAULT_LANDING_PAGE_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Subscribe Center Information
    const unsubCenter = subscribeCenterConfig((cfg) => {
      if (cfg) setCenterConfig(cfg);
    });

    // 2. Subscribe Banking & VietQR
    const unsubBanking = subscribeBankingConfig((cfg) => {
      if (cfg) setBankingConfig(cfg);
    });

    // 3. Subscribe Teaching Shifts
    const unsubShifts = subscribeTeachingShifts((shifts) => {
      if (shifts) setTeachingShifts(shifts);
    });

    // 4. Subscribe Google Apps Script Config
    const unsubGas = subscribeGasConfig((cfg) => {
      if (cfg) setGasConfig(cfg);
    });

    // 5. Subscribe Global Announcement Banner
    const unsubAnnouncement = subscribeAnnouncementConfig((cfg) => {
      if (cfg) setAnnouncementConfig(cfg);
    });

    // 6. Subscribe Classroom Rules
    const unsubRules = subscribeClassroomRules((rules) => {
      if (rules) setClassroomRules(rules);
    });

    // 7. Subscribe Landing Page Content
    const unsubLanding = subscribeLandingPageContent((content) => {
      if (content) setLandingPageContent(content);
    });

    setLoading(false);

    return () => {
      unsubCenter();
      unsubBanking();
      unsubShifts();
      unsubGas();
      unsubAnnouncement();
      unsubRules();
      unsubLanding();
    };
  }, []);

  const updateCenter = async (data) => {
    const updated = await saveCenterConfig(data);
    setCenterConfig(updated);
    return updated;
  };

  const updateBanking = async (data) => {
    const updated = await saveBankingConfig(data);
    setBankingConfig(updated);
    return updated;
  };

  const updateShifts = async (list) => {
    const updated = await saveTeachingShifts(list);
    setTeachingShifts(updated);
    return updated;
  };

  const updateGas = async (data) => {
    const updated = await saveGasConfig(data);
    setGasConfig(updated);
    return updated;
  };

  const updateAnnouncement = async (data) => {
    const updated = await saveAnnouncementConfig(data);
    setAnnouncementConfig(updated);
    return updated;
  };

  const updateRules = async (data) => {
    const updated = await saveClassroomRules(data);
    setClassroomRules(updated);
    return updated;
  };

  const updateLanding = async (data) => {
    const updated = await saveLandingPageContent(data);
    setLandingPageContent(updated);
    return updated;
  };

  const buildQrUrl = ({ amount = 0, transferDescription = "" }) => {
    return buildDynamicVietQrUrl({
      amount,
      transferDescription,
      customConfig: bankingConfig,
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        centerConfig,
        bankingConfig,
        teachingShifts,
        gasConfig,
        announcementConfig,
        classroomRules,
        landingPageContent,
        updateCenterConfig: updateCenter,
        updateBankingConfig: updateBanking,
        updateTeachingShifts: updateShifts,
        updateGasConfig: updateGas,
        updateAnnouncementConfig: updateAnnouncement,
        updateClassroomRules: updateRules,
        updateLandingPageContent: updateLanding,
        buildQrUrl,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
