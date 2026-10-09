import React, { createContext, useContext, useState, useEffect } from "react";
import {
  subscribeCenterConfig,
  subscribeBankingConfig,
  subscribeTeachingShifts,
  subscribeGasConfig,
  saveCenterConfig,
  saveBankingConfig,
  saveTeachingShifts,
  saveGasConfig,
  DEFAULT_CENTER_CONFIG,
  DEFAULT_BANKING_CONFIG,
  DEFAULT_SHIFTS,
  DEFAULT_GAS_CONFIG,
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

    setLoading(false);

    return () => {
      unsubCenter();
      unsubBanking();
      unsubShifts();
      unsubGas();
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
        updateCenterConfig: updateCenter,
        updateBankingConfig: updateBanking,
        updateTeachingShifts: updateShifts,
        updateGasConfig: updateGas,
        buildQrUrl,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
