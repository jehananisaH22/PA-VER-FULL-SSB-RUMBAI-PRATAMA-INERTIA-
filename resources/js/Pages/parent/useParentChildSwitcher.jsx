import { router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ModalPilihAnakOrangTua from "../ModalPilihAnakOrangTua";

const selectedChildStorageKey = "ssb_selected_parent_child";
const selectedChildIdStorageKey = "ssb_selected_parent_child_id";

const normalizeChild = (child) => {
  if (!child) return null;

  if (typeof child === "string") {
    return { id: child, id_siswa: null, name: child, nama_siswa: child };
  }

  const rawId = child.id_siswa ?? child.id ?? child.value ?? null;
  const validId = rawId !== null && rawId !== undefined && String(rawId).trim() !== "" && !Number.isNaN(Number(rawId))
    ? Number(rawId)
    : null;
  const id = validId ?? child.nama_siswa ?? child.name;
  const name = child.nama_siswa ?? child.name ?? child.label ?? String(id || "");

  return {
    ...child,
    id,
    id_siswa: validId,
    name,
    nama_siswa: name,
  };
};

export default function useParentChildSwitcher(
  defaultChildName,
  childrenOptions = [],
  openChildPickerOnLoad = false,
  selectedChildId = null,
  requireChildSelection = false
) {
  const { props } = usePage();
  const parentEmail = props?.studentProfile?.parentEmail || props?.parentEmail || "";
  const initialChildOptions = useMemo(() => {
    const options = childrenOptions.length > 0 ? childrenOptions : [];
    const normalizedOptions = options.map(normalizeChild).filter(Boolean);
    const seenIds = new Set();

    return normalizedOptions.filter((child) => {
      const key = child.id_siswa ?? child.id ?? child.name;
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    });
  }, [childrenOptions]);

  const [activeChildName, setActiveChildName] = useState(() => {
    if (!selectedChildId) return "";
    if (typeof window === "undefined") return defaultChildName || "";

    const selectedChild = initialChildOptions.find(
      (child) => Number(child.id_siswa) === Number(selectedChildId)
    );
    return selectedChild?.name || defaultChildName || "";
  });
  const [childOptions, setChildOptions] = useState(initialChildOptions);
  const [isChildPickerOpen, setIsChildPickerOpen] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [childPickerError, setChildPickerError] = useState("");
  const didAutoSelectSingleChild = useRef(false);
  const mustPickChild = !selectedChildId && (childOptions.length > 0 || requireChildSelection);
  const canAutoSelectSingleChild = !selectedChildId && childOptions.length === 1;

  useEffect(() => {
    if (!props?.csrfToken || !window.axios) return;

    window.axios.defaults.headers.common["X-CSRF-TOKEN"] = props.csrfToken;

    const tokenMeta = document.head.querySelector('meta[name="csrf-token"]');
    if (tokenMeta) {
      tokenMeta.setAttribute("content", props.csrfToken);
    }
  }, [props?.csrfToken]);

  useEffect(() => {
    setChildOptions(initialChildOptions);
  }, [initialChildOptions]);

  const fetchChildren = useCallback(async () => {
    if (!window.axios) return [];

    setIsLoadingChildren(true);
    setChildPickerError("");

    try {
      const response = await window.axios.get("/api/anak");
      const nextChildren = (response.data?.data || []).map(normalizeChild).filter(Boolean);
      setChildOptions((prevChildren) => (nextChildren.length > 0 ? nextChildren : prevChildren));
      return nextChildren;
    } catch (error) {
      setChildPickerError(error.response?.data?.message || "Data anak gagal dimuat.");
      return [];
    } finally {
      setIsLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    if ((openChildPickerOnLoad || mustPickChild) && !canAutoSelectSingleChild) {
      setIsChildPickerOpen(true);
    }
  }, [canAutoSelectSingleChild, mustPickChild, openChildPickerOnLoad]);

  useEffect(() => {
    if (openChildPickerOnLoad || mustPickChild || isChildPickerOpen) {
      fetchChildren();
    }
  }, [fetchChildren, isChildPickerOpen, mustPickChild, openChildPickerOnLoad]);

  useEffect(() => {
    if (!selectedChildId || openChildPickerOnLoad) {
      setActiveChildName("");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(selectedChildStorageKey);
        window.localStorage.removeItem(selectedChildIdStorageKey);
      }
      return;
    }

    if (childOptions.length === 0) return;

    const selectedChild = childOptions.find(
      (child) => Number(child.id_siswa) === Number(selectedChildId)
    );

    if (selectedChild && selectedChild.name !== activeChildName) {
      setActiveChildName(selectedChild.name);
      window.localStorage.setItem(selectedChildStorageKey, selectedChild.name);
      window.localStorage.setItem(selectedChildIdStorageKey, String(selectedChild.id_siswa));
      return;
    }

    if (!childOptions.some((child) => child.name === activeChildName)) {
      const nextChild = selectedChild || childOptions[0];
      setActiveChildName(nextChild.name);
      window.localStorage.setItem(selectedChildStorageKey, nextChild.name);
      if (nextChild.id_siswa) {
        window.localStorage.setItem(selectedChildIdStorageKey, String(nextChild.id_siswa));
      }
    }
  }, [activeChildName, childOptions, selectedChildId, openChildPickerOnLoad]);

  const openChildPicker = () => {
    setIsChildPickerOpen(true);
    fetchChildren();
  };

  const selectChild = useCallback(async (child) => {
    const selectedChild = normalizeChild(child);
    if (!selectedChild) return;

    setChildPickerError("");

    let resolvedChild = selectedChild;

    if (!resolvedChild.id_siswa) {
      const matchedChild = childOptions.find((option) => {
        const normalizedOption = normalizeChild(option);
        return normalizedOption?.id_siswa && normalizedOption.name === selectedChild.name;
      });

      resolvedChild = normalizeChild(matchedChild) || selectedChild;
    }

    if (!resolvedChild.id_siswa) {
      const fetchedChildren = await fetchChildren();
      const fetchedMatch = fetchedChildren.find((option) => option.name === selectedChild.name);
      resolvedChild = normalizeChild(fetchedMatch) || selectedChild;
    }

    if (!resolvedChild.id_siswa) {
      setChildPickerError("Data anak belum lengkap. Silakan pilih ulang setelah data dimuat.");
      return;
    }

    setActiveChildName(resolvedChild.name);
    window.localStorage.setItem(selectedChildStorageKey, resolvedChild.name);
    if (resolvedChild.id_siswa) {
      window.localStorage.setItem(selectedChildIdStorageKey, String(resolvedChild.id_siswa));
    }

    if (resolvedChild.id_siswa && Number(resolvedChild.id_siswa) === Number(selectedChildId)) {
      setIsChildPickerOpen(false);
      return;
    }

    if (window.axios) {
      try {
        const response = await window.axios.post("/api/anak/pilih", {
          id_siswa: resolvedChild.id_siswa,
          nama_siswa: resolvedChild.name,
          current_account_only: true,
        }, {
          headers: {
            "X-CSRF-TOKEN": props?.csrfToken || document.head.querySelector('meta[name="csrf-token"]')?.content || "",
          },
        });
        const responseChildId = response.data?.data?.id_siswa;
        if (responseChildId) {
          window.localStorage.setItem(selectedChildIdStorageKey, String(responseChildId));
        }

        setIsChildPickerOpen(false);
        router.visit("/orang-tua/dashboard", {
          replace: true,
          preserveScroll: false,
        });
        return;
      } catch (error) {
        const errorCode = error.response?.data?.code;
        if (error.response?.status !== 403 || errorCode !== "needs_child_login") {
          setChildPickerError(error.response?.data?.message || "Anak gagal dipilih.");
          return;
        }
      }
    }

    setIsChildPickerOpen(false);
    const loginParams = new URLSearchParams();
    if (parentEmail) loginParams.set("email", parentEmail);
    if (resolvedChild.id_siswa) loginParams.set("switch_child_id", String(resolvedChild.id_siswa));

    router.visit(`/login/orangtua${loginParams.toString() ? `?${loginParams.toString()}` : ""}`, {
      preserveScroll: false,
    });
  }, [childOptions, fetchChildren, parentEmail, props?.csrfToken, selectedChildId]);

  useEffect(() => {
    if (!canAutoSelectSingleChild || didAutoSelectSingleChild.current) return;

    didAutoSelectSingleChild.current = true;
    selectChild(childOptions[0]);
  }, [canAutoSelectSingleChild, childOptions, selectChild]);

  return {
    activeChildName,
    openChildPicker,
    childPickerModal: (
      <ModalPilihAnakOrangTua
        open={isChildPickerOpen}
        childrenOptions={childOptions}
        onSelectChild={selectChild}
        isLoading={isLoadingChildren}
        error={childPickerError}
      />
    ),
  };
}
