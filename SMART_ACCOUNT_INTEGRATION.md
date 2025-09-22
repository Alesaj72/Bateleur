# Smart Account Integration Plan 🚀

## Architecture Hybride Sécurisée

### Vue d'ensemble
Cette intégration ajoute le support Smart Account (ERC4337) tout en maintenant notre architecture zero-knowledge. Les clés privées restent exclusivement côté client.

## Stratégie de Compatibilité Ethers

### Problème Identifié
- **Actuel** : ethers@6.10.0 (incompatible avec Smart Account SDK)
- **Requis** : ethers@5.7.2 pour @0xGasless/smart-account

### Solution Multi-Versions
```javascript
// Namespace separation pour éviter les conflits
window.ethersV6 = ethers; // Version actuelle
// ethersV5 sera chargé séparément pour Smart Account
```

### Architecture des Couches

```
┌─────────────────────────────────────────┐
│           UI/UX Layer                   │
│  ┌─────────────────────────────────────┐ │
│  │  Transaction Type Selector          │ │
│  │  ├─ Classic (Direct wallet)         │ │
│  │  └─ Smart Account (Gasless)         │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│        Transaction Router               │
│  ┌─────────────────────────────────────┐ │
│  │  if (useSmartAccount) {             │ │
│  │    → Smart Account Client           │ │
│  │  } else {                           │ │
│  │    → Classic Ethers Signing         │ │
│  │  }                                  │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│         Security Layer                  │
│  ┌─────────────────────────────────────┐ │
│  │  • sessionStorage ONLY              │ │
│  │  • Local signing (both methods)     │ │
│  │  • No server-side keys              │ │
│  │  • Public data transmission only    │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Étapes d'Implémentation

### Phase 1: Préparation SDK
1. **Ajouter Smart Account SDK** au package.json
2. **Dual ethers loading** dans miniapp/index.html
3. **Variables d'environnement** pour bundler/paymaster URLs

### Phase 2: Interface Unified
1. **Transaction Router** - décide quel système utiliser
2. **Smart Account Wrapper** - encapsule la logique gasless
3. **Fallback System** - bascule vers classic si erreur

### Phase 3: Configuration Sécurisée
1. **Environment Variables**
   ```env
   SMART_ACCOUNT_BUNDLER_URL=https://bundler.0xgasless.com/...
   SMART_ACCOUNT_PAYMASTER_URL=https://paymaster.0xgasless.com/...
   ```

2. **Client-side Configuration**
   ```javascript
   const smartAccountConfig = {
     bundlerUrl: process.env.SMART_ACCOUNT_BUNDLER_URL,
     paymasterUrl: process.env.SMART_ACCOUNT_PAYMASTER_URL,
     // Pas de clés privées ici !
   };
   ```

## Garanties de Sécurité

### ✅ Maintenues
- **Zero-knowledge architecture** : Clés privées jamais transmises au serveur
- **Local storage only** : sessionStorage pour les clés privées
- **Client-side signing** : Signature locale pour les deux systèmes
- **Public data transmission** : Seules les adresses publiques envoyées au bot

### 🔒 Renforcées
- **Transaction type transparency** : L'utilisateur choisit Classic vs Smart Account
- **Fallback security** : Retour automatique vers classic wallet si erreur Smart Account
- **Dual validation** : Validation des transactions dans les deux systèmes

## API de Transition

### Interface Unifiée
```javascript
class WalletManager {
  // Existing ethers v6 methods (unchanged)
  async signTransactionClassic(txData, walletAddress) { ... }
  
  // New Smart Account methods
  async signTransactionSmartAccount(txData, walletAddress) { ... }
  
  // Unified interface
  async signTransaction(txData, walletAddress, useSmartAccount = false) {
    if (useSmartAccount) {
      return this.signTransactionSmartAccount(txData, walletAddress);
    }
    return this.signTransactionClassic(txData, walletAddress);
  }
}
```

### Configuration Smart Account
```javascript
async function createSmartAccountClient(walletAddress) {
  const wallet = getWalletFromSessionStorage(walletAddress);
  
  // Utilise ethers v5 pour la compatibilité Smart Account
  const ethersSigner = new ethersV5.Wallet(wallet.privateKey);
  
  const smartAccount = await createSmartAccountClient({
    signer: ethersSigner,
    bundlerUrl: BUNDLER_URL,
    paymasterUrl: PAYMASTER_URL,
  });
  
  return smartAccount;
}
```

## Tests de Sécurité Requis

1. **Audit des clés privées** : Vérifier qu'aucune clé n'est exposée côté serveur
2. **Test de transmission** : Confirmer que seules les données publiques sont envoyées
3. **Validation dual-signing** : Tester les deux chemins de signature
4. **Fallback testing** : Vérifier le basculement automatique en cas d'erreur

## Migration Progressive

### Étape 1: Préservation totale
- Toutes les fonctionnalités actuelles restent inchangées
- Smart Account ajouté comme option supplémentaire

### Étape 2: Interface de choix
- UI permettant de choisir entre Classic et Smart Account
- Default vers Classic pour préserver l'UX existante

### Étape 3: Optimisation
- Smart Account par défaut pour les nouveaux wallets
- Classic maintenu pour compatibilité