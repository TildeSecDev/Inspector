#!/bin/sh

cd /rtr/run/conf/
echo 1 > /proc/sys/net/ipv6/conf/all/disable_ipv6
echo 1 > /proc/sys/net/ipv6/conf/default/disable_ipv6
echo 0 > /proc/sys/net/ipv6/conf/lo/disable_ipv6
ip link set lo up mtu 65535
ip addr add 127.0.0.1/8 dev lo
ip addr add ::1/128 dev lo
ulimit -c unlimited
#modprobe -r kvm_intel
#modprobe kvm_intel nested=1
#echo 1 > /sys/kernel/mm/ksm/run

### macs ###
echo starting macs.
# eth0 ba:40:85:7d:c5:1e #
# ethernet1 aa:c1:ab:0a:14:b4 #
# ethernet2 aa:c1:ab:a2:b4:3b #
# ethernet3 aa:c1:ab:31:05:97 #
# ethernet4 aa:c1:ab:f8:77:4a #
# ethernet5 aa:c1:ab:d4:e8:b2 #
# ethernet6 aa:c1:ab:98:c8:88 #

### interfaces ###
echo starting interfaces.
ip link set ethernet1 up multicast on promisc on mtu 1500
ethtool -K ethernet1 rx off
ethtool -K ethernet1 tx off
ethtool -K ethernet1 sg off
ethtool -K ethernet1 tso off
ethtool -K ethernet1 ufo off
ethtool -K ethernet1 gso off
ethtool -K ethernet1 gro off
ethtool -K ethernet1 lro off
ethtool -K ethernet1 rxvlan off
ethtool -K ethernet1 txvlan off
ethtool -K ethernet1 ntuple off
ethtool -K ethernet1 rxhash off
ethtool --set-eee ethernet1 eee off
ip link set ethernet2 up multicast on promisc on mtu 1500
ethtool -K ethernet2 rx off
ethtool -K ethernet2 tx off
ethtool -K ethernet2 sg off
ethtool -K ethernet2 tso off
ethtool -K ethernet2 ufo off
ethtool -K ethernet2 gso off
ethtool -K ethernet2 gro off
ethtool -K ethernet2 lro off
ethtool -K ethernet2 rxvlan off
ethtool -K ethernet2 txvlan off
ethtool -K ethernet2 ntuple off
ethtool -K ethernet2 rxhash off
ethtool --set-eee ethernet2 eee off
ip link set ethernet3 up multicast on promisc on mtu 1500
ethtool -K ethernet3 rx off
ethtool -K ethernet3 tx off
ethtool -K ethernet3 sg off
ethtool -K ethernet3 tso off
ethtool -K ethernet3 ufo off
ethtool -K ethernet3 gso off
ethtool -K ethernet3 gro off
ethtool -K ethernet3 lro off
ethtool -K ethernet3 rxvlan off
ethtool -K ethernet3 txvlan off
ethtool -K ethernet3 ntuple off
ethtool -K ethernet3 rxhash off
ethtool --set-eee ethernet3 eee off
ip link set ethernet4 up multicast on promisc on mtu 1500
ethtool -K ethernet4 rx off
ethtool -K ethernet4 tx off
ethtool -K ethernet4 sg off
ethtool -K ethernet4 tso off
ethtool -K ethernet4 ufo off
ethtool -K ethernet4 gso off
ethtool -K ethernet4 gro off
ethtool -K ethernet4 lro off
ethtool -K ethernet4 rxvlan off
ethtool -K ethernet4 txvlan off
ethtool -K ethernet4 ntuple off
ethtool -K ethernet4 rxhash off
ethtool --set-eee ethernet4 eee off
ip link set ethernet5 up multicast on promisc on mtu 1500
ethtool -K ethernet5 rx off
ethtool -K ethernet5 tx off
ethtool -K ethernet5 sg off
ethtool -K ethernet5 tso off
ethtool -K ethernet5 ufo off
ethtool -K ethernet5 gso off
ethtool -K ethernet5 gro off
ethtool -K ethernet5 lro off
ethtool -K ethernet5 rxvlan off
ethtool -K ethernet5 txvlan off
ethtool -K ethernet5 ntuple off
ethtool -K ethernet5 rxhash off
ethtool --set-eee ethernet5 eee off
ip link set ethernet6 up multicast on promisc on mtu 1500
ethtool -K ethernet6 rx off
ethtool -K ethernet6 tx off
ethtool -K ethernet6 sg off
ethtool -K ethernet6 tso off
ethtool -K ethernet6 ufo off
ethtool -K ethernet6 gso off
ethtool -K ethernet6 gro off
ethtool -K ethernet6 lro off
ethtool -K ethernet6 rxvlan off
ethtool -K ethernet6 txvlan off
ethtool -K ethernet6 ntuple off
ethtool -K ethernet6 rxhash off
ethtool --set-eee ethernet6 eee off

### lines ###
echo starting lines.

### main ###
echo starting main.
start-stop-daemon -S -b -x /rtr/run/conf/hwdet-main.sh
exit 0
