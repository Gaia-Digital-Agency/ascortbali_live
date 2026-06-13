# Creator Contacts — OpenClaw invitation database

This is **Charlie's contact database** for the one-time WhatsApp creator invitations. Each creator
is matched to the invitation template for their DEMS category. Generated from the app database
(`providers` table, `gda-pn01:ascortbali`) on **2026-06-14** — regenerate when the creator list changes.

## How it's built
- **Name** ← `providers.model_name` (fills the `{{name}}` merge field in the template).
- **Phone** ← `providers.cell_phone`, normalised to E.164 (`+` then digits).
- **Category / Template**:
  - `gender = 'trans'` → **trans.md** (takes precedence)
  - else `escort_type`: `escort` → **escorts.md**, `dating` → **dating.md**,
    `massage` → **massage.md**, `sugar babies` → **sugar.md**
- **provider_id** ← `providers.provider_id` (traceability back to the DB row).

## Send rule
For each contact, send the template in the **Template** column, replacing `{{name}}` with **Name**.
**One message per number, fire-and-forget** (no follow-up needed). De-duplicate by phone.

## Summary — 230 contacts
| Category | Template | Count |
|---|---|---|
| escorts | escorts.md | 170 |
| dating  | dating.md  | 29  |
| massage | massage.md | 14  |
| sugar   | sugar.md   | 11  |
| trans   | trans.md   | 6   |

## ⚠️ Duplicate numbers (same WhatsApp on multiple profiles — send only once)
- `+37360808341` — mistress-viola, lina
- `+380669265774` — mary, tess
- `+380954174109` — lissa, aira, vikky, alice, alexa, alla
- `+380957512429` — anita, kriss-kiss
- `+380990382300` — marta, olivia
- `+79181984588` — milana, veronika

## Contacts
| Name | Phone | Category | Template | provider_id |
|---|---|---|---|---|
| anastasia | +79277529365 | dating | dating.md | 1029628 |
| angel-masha | +79044176114 | dating | dating.md | 416648 |
| anggun | +62881037893179 | dating | dating.md | 847034 |
| Aulia | +6287833054840 | dating | dating.md | P392B3BBC |
| chloe | +6281919698225 | dating | dating.md | 869276 |
| Debby | +6282144856134 | dating | dating.md | P7DC6E5F4 |
| dila | +6285606221502 | dating | dating.md | 972384 |
| Fiona | +628976746828 | dating | dating.md | PD099BE73 |
| freya | +6285962542534 | dating | dating.md | 1030183 |
| Ghauri | +6282364135549 | dating | dating.md | P77A52F26 |
| hana-ghania | +62881037344171 | dating | dating.md | 896515 |
| kania | +62881037106032 | dating | dating.md | 738940 |
| kenzaa | +6287758906498 | dating | dating.md | 708278 |
| Key | +6285855455339 | dating | dating.md | P96D8387E |
| Laura | +62881038386122 | dating | dating.md | PD76206D9 |
| Lia | +6283167192690 | dating | dating.md | PD1F8B894 |
| Lily | +628991285954 | dating | dating.md | P21796415 |
| Lily Rose | +6285800436828 | dating | dating.md | P40DABF9C |
| nancy | +6282340060120 | dating | dating.md | 530780 |
| olivia-quinn | +6281997271100 | dating | dating.md | 764818 |
| Rika | +6287787644642 | dating | dating.md | P8A58FED8 |
| sarah | +6282116400808 | dating | dating.md | 946422 |
| shara-anindya | +6283183354742 | dating | dating.md | 1039011 |
| sherlina | +6282125041007 | dating | dating.md | 970220 |
| Uda | +8619584845264 | dating | dating.md | P2C915F43 |
| Valent | +6282144314941 | dating | dating.md | P6DBC82A5 |
| vanessa | +6285282692981 | dating | dating.md | 954613 |
| victoria | +79162924777 | dating | dating.md | 807591 |
| yana | +79264241000 | dating | dating.md | 777204 |
| Abel | +6288987412677 | escorts | escorts.md | PA2371755 |
| aca | +6281770924121 | escorts | escorts.md | 960998 |
| Adlina | +6289529987344 | escorts | escorts.md | P68817BE3 |
| Agatha | +6281239501430 | escorts | escorts.md | PC22FD0DA |
| aira | +380954174109 | escorts | escorts.md | 572512 |
| alara | +628133696414 | escorts | escorts.md | 406433 |
| alexa | +380954174109 | escorts | escorts.md | 983472 |
| Aleza | +6285785073985 | escorts | escorts.md | PE9ABD3CB |
| alice | +380954174109 | escorts | escorts.md | 719087 |
| alicia-sasya | +6282144027184 | escorts | escorts.md | 1020394 |
| Alina | +60135028500 | escorts | escorts.md | P3F9F842F |
| aline | +62882009169020 | escorts | escorts.md | 1032182 |
| alisa | +77475068586 | escorts | escorts.md | 1009003 |
| alla | +380954174109 | escorts | escorts.md | 990086 |
| Alyna | +6285785107198 | escorts | escorts.md | PB8EB0CC8 |
| amber-olivia | +6285647263831 | escorts | escorts.md | 1027510 |
| Amel | +628976843595 | escorts | escorts.md | PBFE75631 |
| Amelia | +6289679147091 | escorts | escorts.md | PB26170C7 |
| angel | +6285745243872 | escorts | escorts.md | 796289 |
| Angela | +6285726006186 | escorts | escorts.md | P4DD468F2 |
| Anggi | +628217148819 | escorts | escorts.md | PC421EF4F |
| anita | +380957512429 | escorts | escorts.md | 1018018 |
| anna-adelyn | +6287711902305 | escorts | escorts.md | 1040646 |
| April | +6285136586097 | escorts | escorts.md | PC6459921 |
| Aprilia | +6283169480375 | escorts | escorts.md | PAE6A908A |
| Aria | +6283176108038 | escorts | escorts.md | PBCD3CF68 |
| Ariana | +6281228819604 | escorts | escorts.md | P62A5B342 |
| arina | +447883261874 | escorts | escorts.md | 944542 |
| Arlinda | +628211847571 | escorts | escorts.md | PA358CC33 |
| ashey | +79092799369 | escorts | escorts.md | 976284 |
| Ayu | +62895429374074 | escorts | escorts.md | P220E5555 |
| Becky | +6283189360523 | escorts | escorts.md | PBBB537C2 |
| Belinda | +6285338050404 | escorts | escorts.md | P42ECDDCD |
| Bella | +6287818394434 | escorts | escorts.md | P36525C3A |
| Belle | +6287752525801 | escorts | escorts.md | P0D1DF0A1 |
| Benita | +6289526272690 | escorts | escorts.md | P7099A4EF |
| bianca | +6282230890986 | escorts | escorts.md | 1015972 |
| Biilqisabillaaaaa | +6285602783130 | escorts | escorts.md | PBC993F72 |
| Brenda | +6282134692699 | escorts | escorts.md | P8C45CCB9 |
| Bunga | +6285737839557 | escorts | escorts.md | PEEEA4A9D |
| Candice | +6287818394478 | escorts | escorts.md | P54A398FF |
| candy | +6581558736 | escorts | escorts.md | 958169 |
| Cassie | +628213134481 | escorts | escorts.md | PD0D01CEB |
| Celia | +6289525921510 | escorts | escorts.md | P03733F15 |
| Cendy | +6287818394415 | escorts | escorts.md | P459A13A0 |
| Charin | +6287818721844 | escorts | escorts.md | P8DCE16A5 |
| Chintya | +6282211169934 | escorts | escorts.md | P9785B100 |
| Cici | +6287866888370 | escorts | escorts.md | PA65D08F0 |
| Cicillia | +6285823059871 | escorts | escorts.md | P149870E1 |
| cindy | +628566589401 | escorts | escorts.md | 888237 |
| Citra | +6285726915603 | escorts | escorts.md | PADD54747 |
| clara | +6287773875816 | escorts | escorts.md | 727912 |
| clarisa | +6285359683898 | escorts | escorts.md | 851729 |
| Clarissa | +6289525879723 | escorts | escorts.md | P689BCA54 |
| Claudia | +6285190815559 | escorts | escorts.md | PA0667A04 |
| daria-tall | +6282342174653 | escorts | escorts.md | 694366 |
| Davina | +6288276770221 | escorts | escorts.md | PD4B9FA6C |
| Deena | +62881037036464 | escorts | escorts.md | P676EEC85 |
| Delis | +6281238474259 | escorts | escorts.md | PE92A010E |
| Devi | +6285955343477 | escorts | escorts.md | P6866C224 |
| dewi | +6285283859648 | escorts | escorts.md | 975904 |
| Eca | +62881037987748 | escorts | escorts.md | P7A9BBF64 |
| elisa | +6287754430639 | escorts | escorts.md | 1017231 |
| ella | +6281225467364 | escorts | escorts.md | 858019 |
| Engel | +6283878910898 | escorts | escorts.md | P02DDDBCE |
| Ewie | +6281252521005 | escorts | escorts.md | PA3ECEC43 |
| Farasha | +628135926419 | escorts | escorts.md | PCBC6FE12 |
| Fey | +6281373807577 | escorts | escorts.md | PFAA76DDD |
| Fio | +6281994807351 | escorts | escorts.md | P021382E2 |
| Gaby | +6287818721835 | escorts | escorts.md | PC1FEAC57 |
| Gisel | +6288994214058 | escorts | escorts.md | P4FF29989 |
| Hana | +6289510329839 | escorts | escorts.md | P5EEC96DF |
| Icaa | +628216330724 | escorts | escorts.md | P9E14371F |
| Indah | +628999102081 | escorts | escorts.md | P6AA98655 |
| Ivony | +62895630180230 | escorts | escorts.md | P2D60FC06 |
| Ivy | +6289682550623 | escorts | escorts.md | P9AC2C408 |
| jenny | +6285161282178 | escorts | escorts.md | 496989 |
| julia | +6282326988197 | escorts | escorts.md | 969787 |
| Karin | +6285191317469 | escorts | escorts.md | PAAC51E9A |
| Karina | +6281337369594 | escorts | escorts.md | PF50523A1 |
| Kerin | +6287765300329 | escorts | escorts.md | PEBE0382F |
| Kinan | +628977168496 | escorts | escorts.md | PCA66EF01 |
| kriss-kiss | +380957512429 | escorts | escorts.md | 974432 |
| kristy | +6282221772112 | escorts | escorts.md | 977407 |
| leena | +6285810550466 | escorts | escorts.md | 747396 |
| Lila | +6287849661904 | escorts | escorts.md | PB66E2995 |
| lina | +37360808341 | escorts | escorts.md | 691646 |
| lisa | +380990382325 | escorts | escorts.md | 646634 |
| lissa | +380954174109 | escorts | escorts.md | 646791 |
| Lizzy | +6289529693053 | escorts | escorts.md | P7A55015B |
| Lula | +6281573348776 | escorts | escorts.md | P0BB61D53 |
| Lusy | +6285808759204 | escorts | escorts.md | PBE6B3713 |
| maria | +37368205009 | escorts | escorts.md | 1034416 |
| marta | +380990382300 | escorts | escorts.md | 949679 |
| mary | +380669265774 | escorts | escorts.md | 842989 |
| Max | +33758677096 | escorts | escorts.md | 923493 |
| Maya | +6281717309335 | escorts | escorts.md | P16469C46 |
| mia | +971523503066 | escorts | escorts.md | 715396 |
| milana | +79181984588 | escorts | escorts.md | 889758 |
| Milly | +6283176957613 | escorts | escorts.md | P62F3F3A2 |
| mistress-viola | +37360808341 | escorts | escorts.md | 983354 |
| Monalissa | +6288987209847 | escorts | escorts.md | PF1C1D6CC |
| nabila | +6283168693238 | escorts | escorts.md | 1000498 |
| nadia | +6288245703732 | escorts | escorts.md | 1016226 |
| nia | +6282177507379 | escorts | escorts.md | 533378 |
| Nichol | +628131974232 | escorts | escorts.md | P1892FF03 |
| Nilla | +6285191383864 | escorts | escorts.md | P26742ABB |
| Nindi | +628135324908 | escorts | escorts.md | P3127A177 |
| Nya | +6285121202421 | escorts | escorts.md | P7D13675C |
| olivia | +380990382300 | escorts | escorts.md | 1040564 |
| Preshie | +6289671931291 | escorts | escorts.md | P58D97DAF |
| Preshy | +6289673147294 | escorts | escorts.md | P46A845D8 |
| Priska | +6287767751635 | escorts | escorts.md | PBA5C0325 |
| Qiona | +6281953357883 | escorts | escorts.md | P6BFDB723 |
| rachel | +628133941081 | escorts | escorts.md | 1037166 |
| Rahayu | +62895623085539 | escorts | escorts.md | P8F05AD6E |
| Rara | +6289505344736 | escorts | escorts.md | P6044C048 |
| Rere | +6282233488356 | escorts | escorts.md | PAF9A7030 |
| Reysha | +6285602840317 | escorts | escorts.md | P0F8D1C82 |
| Rina | +6281227133828 | escorts | escorts.md | PEFC6BDED |
| Rosa | +6289677361900 | escorts | escorts.md | P87C598DE |
| ruby | +6282233124184 | escorts | escorts.md | 368935 |
| Sabilla | +628133833366 | escorts | escorts.md | P1FA38650 |
| salmaa | +6285794014922 | escorts | escorts.md | 974796 |
| salsyaaa | +6285712273745 | escorts | escorts.md | P3AB0E5C0 |
| sanly-amora | +62881037625366 | escorts | escorts.md | 1000554 |
| Sari | +628213845696 | escorts | escorts.md | P90CAE0DC |
| sasha | +66955106145 | escorts | escorts.md | 1027384 |
| Saskia | +6285650852983 | escorts | escorts.md | PE9572A05 |
| sendi | +972555073977 | escorts | escorts.md | 1011467 |
| Shami | +6285925570524 | escorts | escorts.md | P515AA796 |
| Sharaa | +6281343072727 | escorts | escorts.md | P1F37C407 |
| Shella | +6285743633485 | escorts | escorts.md | PEF255D62 |
| Shina | +61422376145 | escorts | escorts.md | PACB48A7E |
| shopia | +6287744015162 | escorts | escorts.md | 890711 |
| sisiel | +62881037667959 | escorts | escorts.md | PD9EBE348 |
| Sisil | +6287842284421 | escorts | escorts.md | P79BDFEAE |
| Sofie | +6287818394429 | escorts | escorts.md | PD8A7BD89 |
| sophia | +37368108943 | escorts | escorts.md | 947246 |
| sweeth | +6285117277039 | escorts | escorts.md | 545325 |
| Tammy | +6289523944449 | escorts | escorts.md | P34081324 |
| Tania | +6281529345944 | escorts | escorts.md | P18F740A4 |
| tanya | +6285755475855 | escorts | escorts.md | 528877 |
| Tara | +6283159837616 | escorts | escorts.md | P27E4DF6D |
| Tasya | +6281325235220 | escorts | escorts.md | PA63ECA6C |
| Tata | +62895320801445 | escorts | escorts.md | P39ED2FDB |
| Terry | +6281355540696 | escorts | escorts.md | PB8702786 |
| tess | +380669265774 | escorts | escorts.md | 525740 |
| tiara-adhisty | +6283183428636 | escorts | escorts.md | 1037477 |
| Tina | +6287885981987 | escorts | escorts.md | P30884C7E |
| valentina | +61406263985 | escorts | escorts.md | 684188 |
| valerie | +6288987408410 | escorts | escorts.md | 716950 |
| Vela | +6289517564285 | escorts | escorts.md | PF5ECC112 |
| Veona | +628133936578 | escorts | escorts.md | PA3C24E3D |
| Vera | +62895429668835 | escorts | escorts.md | PC4363213 |
| Veronica | +6285785068099 | escorts | escorts.md | PC42F313F |
| veronika | +79181984588 | escorts | escorts.md | 888162 |
| Verra | +6285735540921 | escorts | escorts.md | P42C32179 |
| Victory | +6289677367100 | escorts | escorts.md | PE7F66EF3 |
| vikky | +380954174109 | escorts | escorts.md | 555403 |
| Violet | +628131852438 | escorts | escorts.md | P067D43F7 |
| Viona | +6282342488860 | escorts | escorts.md | PE87F6034 |
| Vioo | +6282230863009 | escorts | escorts.md | PDA3409E7 |
| Vivi | +628972253042 | escorts | escorts.md | PC9A36269 |
| Winn | +6282148417679 | escorts | escorts.md | P7E337C51 |
| Zahra | +628881373641 | escorts | escorts.md | P596A4B9F |
| Zaskiaa | +6282170580229 | escorts | escorts.md | PF4754B67 |
| Zen | +6287756481685 | escorts | escorts.md | P266E9358 |
| Zina | +628977177445 | escorts | escorts.md | PEABFB34D |
| zoya | +6285746369139 | escorts | escorts.md | 1030518 |
| callista | +6282144288224 | massage | massage.md | 835389 |
| chalista | +6285945954393 | massage | massage.md | 879306 |
| elvira | +6288703257575 | massage | massage.md | 442622 |
| frilicia | +6287894992423 | massage | massage.md | 1005142 |
| gladis-nadien | +6287817545577 | massage | massage.md | 848785 |
| ika | +6283865047279 | massage | massage.md | 1016962 |
| jesslyn-amanda | +6287754940465 | massage | massage.md | 802794 |
| kiara | +6288245570043 | massage | massage.md | 796249 |
| kimberly | +6281370002869 | massage | massage.md | 954688 |
| melanie | +628133974477 | massage | massage.md | 645223 |
| shanon | +6288989644778 | massage | massage.md | 687292 |
| stacy | +6282341598832 | massage | massage.md | 683526 |
| vanesyaa | +6281211838869 | massage | massage.md | 897979 |
| Widji | +6287862483737 | massage | massage.md | P4B32DFCC |
| Anggita | +6281239338602 | sugar | sugar.md | P4668609C |
| anggraini | +6288245227154 | sugar | sugar.md | 1016632 |
| audrey | +6287786250276 | sugar | sugar.md | 791973 |
| jessy | +6281330803912 | sugar | sugar.md | 850847 |
| katarina | +66917016929 | sugar | sugar.md | 945960 |
| Maharani | +6281220868199 | sugar | sugar.md | PDA93DC40 |
| Meghan | +447503825693 | sugar | sugar.md | 1008359 |
| polina | +79164422643 | sugar | sugar.md | 391017 |
| Tashia | +6289685085165 | sugar | sugar.md | P0EBD255B |
| vina | +6282277799171 | sugar | sugar.md | 645159 |
| viola | +628889662387 | sugar | sugar.md | 893710 |
| Bela | +6287869799758 | trans | trans.md | P24DDFDAB |
| Bibie | +62881037023641 | trans | trans.md | PCF3E2C22 |
| Tenov | +6285800709963 | trans | trans.md | P142D21AF |
| Tinaya | +6285755179466 | trans | trans.md | P45537EEF |
| Vhanessa | +6281337172880 | trans | trans.md | P9BF2D368 |
| Yasmin | +62881037987049 | trans | trans.md | P81503D7C |

